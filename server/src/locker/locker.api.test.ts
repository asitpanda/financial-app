import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { LockerModule } from './locker.module';

const jwtSecret = 'locker-api-test-signing-secret';
const defaultFields = [{ label: 'Username', type: 'text', masked: false }];

describe('Locker API', () => {
  let app: INestApplication;
  let userOneToken: string;
  let userTwoToken: string;
  const createdEntities: Array<{ uid: string; token: string }> = [];

  beforeAll(async () => {
    const configValues: Record<string, string> = {
      DB_PROVIDER: 'mock',
      JWT_SECRET: jwtSecret,
      JWT_EXPIRES_IN: '1h',
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => configValues],
        }),
        AuthModule,
        LockerModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    })
      .overrideProvider(ConfigService)
      .useValue({ get: (key: string) => configValues[key] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    const jwtService = app.get(JwtService);
    userOneToken = jwtService.sign({ sub: '1', email: 'demo@example.com' });
    userTwoToken = jwtService.sign({ sub: '2', email: 'demo2@example.com' });
  });

  afterEach(async () => {
    for (const { uid, token } of createdEntities.splice(0)) {
      await request(app.getHttpServer())
        .delete(`/api/locker/entities/${uid}`)
        .set('Authorization', `Bearer ${token}`);
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function createEntity(
    label: string,
    token = userOneToken,
    fields: typeof defaultFields = defaultFields,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/locker/entities')
      .set('Authorization', `Bearer ${token}`)
      .send({ label, fields });

    if (response.status === 201 && response.body.uid) {
      createdEntities.push({ uid: response.body.uid, token });
    }
    return response;
  }

  async function createRecord(entityUid: string, fieldUid: string, token = userOneToken) {
    return request(app.getHttpServer())
      .post('/api/locker/records')
      .set('Authorization', `Bearer ${token}`)
      .send({ entityUid, label: 'Primary login', values: { [fieldUid]: 'alice' } });
  }

  describe('POST /api/locker/entities', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/locker/entities')
        .send({ label: 'Accounts', fields: defaultFields });

      expect(response.status).toBe(401);
    });

    it('creates an entity for the authenticated user and normalizes password masking', async () => {
      const response = await createEntity('Passwords', userOneToken, [
        { label: 'Secret', type: 'password', masked: false },
      ]);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        label: 'Passwords',
        userId: 1,
        fields: [{ uid: expect.any(String), label: 'Secret', type: 'password', masked: true }],
      });
      expect(response.body.uid).toEqual(expect.any(String));
    });

    it('rejects invalid nested fields and properties outside the request DTO', async () => {
      const invalidField = await request(app.getHttpServer())
        .post('/api/locker/entities')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ label: 'Accounts', fields: [{ label: '', type: 'unknown', masked: false }] });
      const extraProperty = await request(app.getHttpServer())
        .post('/api/locker/entities')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ label: 'Accounts', fields: defaultFields, userId: 2 });

      expect(invalidField.status).toBe(400);
      expect(extraProperty.status).toBe(400);
    });
  });

  describe('GET /api/locker/entities', () => {
    it('returns only entities belonging to the authenticated user', async () => {
      const ownedEntity = await createEntity('Owner entity');
      const otherEntity = await createEntity('Other entity', userTwoToken);
      const ownerResponse = await request(app.getHttpServer())
        .get('/api/locker/entities')
        .set('Authorization', `Bearer ${userOneToken}`);
      const otherUserResponse = await request(app.getHttpServer())
        .get('/api/locker/entities')
        .set('Authorization', `Bearer ${userTwoToken}`);

      expect(ownedEntity.status).toBe(201);
      expect(otherEntity.status).toBe(201);
      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toEqual([expect.objectContaining({ uid: ownedEntity.body.uid, userId: 1 })]);
      expect(otherUserResponse.status).toBe(200);
      expect(otherUserResponse.body).toEqual([expect.objectContaining({ uid: otherEntity.body.uid, userId: 2 })]);
    });
  });

  describe('GET /api/locker/entities/:uid', () => {
    it('returns the entity to its owner and rejects malformed identifiers', async () => {
      const created = await createEntity('Single entity');
      const ownerResponse = await request(app.getHttpServer())
        .get(`/api/locker/entities/${created.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`);
      const invalidUidResponse = await request(app.getHttpServer())
        .get('/api/locker/entities/not-a-uuid')
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toMatchObject({ uid: created.body.uid, label: 'Single entity', userId: 1 });
      expect(invalidUidResponse.status).toBe(400);
    });

    it('does not disclose an entity to another user', async () => {
      const created = await createEntity('Private entity');
      const response = await request(app.getHttpServer())
        .get(`/api/locker/entities/${created.body.uid}`)
        .set('Authorization', `Bearer ${userTwoToken}`);

      expect(response.status).toBe(200);
      expect(response.text).not.toContain(created.body.uid);
    });
  });

  describe('PATCH /api/locker/entities/:uid', () => {
    it('updates an owned entity and leaves another user update unchanged', async () => {
      const created = await createEntity('Before update');
      const otherUserResponse = await request(app.getHttpServer())
        .patch(`/api/locker/entities/${created.body.uid}`)
        .set('Authorization', `Bearer ${userTwoToken}`)
        .send({ label: 'Unauthorized update' });
      const unchangedEntity = await request(app.getHttpServer())
        .get(`/api/locker/entities/${created.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`);
      const ownerResponse = await request(app.getHttpServer())
        .patch(`/api/locker/entities/${created.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ label: 'After update' });

      expect(otherUserResponse.status).toBe(200);
      expect(unchangedEntity.body).toMatchObject({ label: 'Before update' });
      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toMatchObject({ uid: created.body.uid, label: 'After update' });
    });

    it('rejects an empty label and a malformed entity identifier', async () => {
      const emptyLabel = await request(app.getHttpServer())
        .patch('/api/locker/entities/00000000-0000-4000-8000-000000000001')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ label: '' });
      const invalidUid = await request(app.getHttpServer())
        .patch('/api/locker/entities/not-a-uuid')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ label: 'Valid label' });

      expect(emptyLabel.status).toBe(400);
      expect(invalidUid.status).toBe(400);
    });
  });

  describe('DELETE /api/locker/entities/:uid', () => {
    it('deletes an owned entity and its records without allowing another user to delete it', async () => {
      const created = await createEntity('Entity to delete');
      const fieldUid = created.body.fields[0].uid as string;
      const recordResponse = await createRecord(created.body.uid, fieldUid);
      expect(recordResponse.status).toBe(201);

      const otherUserResponse = await request(app.getHttpServer())
        .delete(`/api/locker/entities/${created.body.uid}`)
        .set('Authorization', `Bearer ${userTwoToken}`);
      const ownerResponse = await request(app.getHttpServer())
        .delete(`/api/locker/entities/${created.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`);
      const remainingRecords = await request(app.getHttpServer())
        .get(`/api/locker/records?entityUid=${created.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(otherUserResponse.status).toBe(200);
      expect(ownerResponse.status).toBe(200);
      expect(remainingRecords.status).toBe(200);
      expect(remainingRecords.body).toEqual([]);
    });
  });

  describe('POST /api/locker/records', () => {
    it('creates a record for an entity owned by the authenticated user', async () => {
      const created = await createEntity('Record parent');
      const fieldUid = created.body.fields[0].uid as string;
      const response = await createRecord(created.body.uid, fieldUid);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        uid: expect.any(String),
        entityUid: created.body.uid,
        label: 'Primary login',
        values: { [fieldUid]: 'alice' },
      });
    });

    it('rejects malformed request values and prevents attaching to another user entity', async () => {
      const created = await createEntity('Protected parent');
      const fieldUid = created.body.fields[0].uid as string;
      const invalidValues = await request(app.getHttpServer())
        .post('/api/locker/records')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ entityUid: created.body.uid, label: 'Invalid', values: [] });
      const otherUserResponse = await createRecord(created.body.uid, fieldUid, userTwoToken);

      expect(invalidValues.status).toBe(400);
      expect(otherUserResponse.status).toBe(201);
      expect(otherUserResponse.body?.uid).toBeFalsy();
    });
  });

  describe('GET /api/locker/records', () => {
    it('lists only owned records and supports filtering by entity UID', async () => {
      const firstEntity = await createEntity('First parent');
      const secondEntity = await createEntity('Second parent');
      const otherEntity = await createEntity('Other parent', userTwoToken);
      await createRecord(firstEntity.body.uid, firstEntity.body.fields[0].uid);
      await createRecord(secondEntity.body.uid, secondEntity.body.fields[0].uid);
      await createRecord(otherEntity.body.uid, otherEntity.body.fields[0].uid, userTwoToken);

      const allRecords = await request(app.getHttpServer())
        .get('/api/locker/records')
        .set('Authorization', `Bearer ${userOneToken}`);
      const filteredRecords = await request(app.getHttpServer())
        .get(`/api/locker/records?entityUid=${firstEntity.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`);
      const invalidFilter = await request(app.getHttpServer())
        .get('/api/locker/records?entityUid=not-a-uuid')
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(allRecords.status).toBe(200);
      expect(allRecords.body).toHaveLength(2);
      expect(allRecords.body).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ entityUid: otherEntity.body.uid })]),
      );
      expect(filteredRecords.status).toBe(200);
      expect(filteredRecords.body).toEqual([
        expect.objectContaining({ entityUid: firstEntity.body.uid }),
      ]);
      expect(invalidFilter.status).toBe(400);
    });
  });

  describe('GET /api/locker/records/:uid', () => {
    it('returns a record to its owner and rejects malformed identifiers', async () => {
      const created = await createEntity('Record lookup parent');
      const response = await createRecord(created.body.uid, created.body.fields[0].uid);
      const ownerResponse = await request(app.getHttpServer())
        .get(`/api/locker/records/${response.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`);
      const invalidUidResponse = await request(app.getHttpServer())
        .get('/api/locker/records/not-a-uuid')
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toMatchObject({ uid: response.body.uid, entityUid: created.body.uid });
      expect(invalidUidResponse.status).toBe(400);
    });

    it('does not disclose a record to another user', async () => {
      const created = await createEntity('Private record parent');
      const recordResponse = await createRecord(created.body.uid, created.body.fields[0].uid);
      const response = await request(app.getHttpServer())
        .get(`/api/locker/records/${recordResponse.body.uid}`)
        .set('Authorization', `Bearer ${userTwoToken}`);

      expect(response.status).toBe(200);
      expect(response.text).not.toContain(recordResponse.body.uid);
    });
  });

  describe('PATCH /api/locker/records/:uid', () => {
    it('updates an owned record and prevents another user from changing it', async () => {
      const created = await createEntity('Record update parent');
      const recordResponse = await createRecord(created.body.uid, created.body.fields[0].uid);
      const otherUserResponse = await request(app.getHttpServer())
        .patch(`/api/locker/records/${recordResponse.body.uid}`)
        .set('Authorization', `Bearer ${userTwoToken}`)
        .send({ label: 'Unauthorized update' });
      const unchangedRecord = await request(app.getHttpServer())
        .get(`/api/locker/records/${recordResponse.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`);
      const ownerResponse = await request(app.getHttpServer())
        .patch(`/api/locker/records/${recordResponse.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ label: 'Updated login' });

      expect(otherUserResponse.status).toBe(200);
      expect(unchangedRecord.body).toMatchObject({ label: 'Primary login' });
      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toMatchObject({ uid: recordResponse.body.uid, label: 'Updated login' });
    });

    it('rejects values that are not an object', async () => {
      const created = await createEntity('Invalid update parent');
      const recordResponse = await createRecord(created.body.uid, created.body.fields[0].uid);
      const response = await request(app.getHttpServer())
        .patch(`/api/locker/records/${recordResponse.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ values: [] });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/locker/records/:uid', () => {
    it('deletes an owned record and leaves it intact after another user request', async () => {
      const created = await createEntity('Record delete parent');
      const recordResponse = await createRecord(created.body.uid, created.body.fields[0].uid);
      const otherUserResponse = await request(app.getHttpServer())
        .delete(`/api/locker/records/${recordResponse.body.uid}`)
        .set('Authorization', `Bearer ${userTwoToken}`);
      const ownerLookup = await request(app.getHttpServer())
        .get(`/api/locker/records/${recordResponse.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`);
      const ownerResponse = await request(app.getHttpServer())
        .delete(`/api/locker/records/${recordResponse.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`);
      const deletedLookup = await request(app.getHttpServer())
        .get(`/api/locker/records/${recordResponse.body.uid}`)
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(otherUserResponse.status).toBe(200);
      expect(ownerLookup.body).toMatchObject({ uid: recordResponse.body.uid });
      expect(ownerResponse.status).toBe(200);
      expect(deletedLookup.status).toBe(200);
      expect(deletedLookup.text).not.toContain(recordResponse.body.uid);
    });
  });
});