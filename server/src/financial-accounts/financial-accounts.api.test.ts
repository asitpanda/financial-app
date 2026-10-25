import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { FinancialAccountsModule } from './financial-accounts.module';

const jwtSecret = 'financial-accounts-api-test-signing-secret';

describe('Financial Accounts API', () => {
  let app: INestApplication;
  let userOneToken: string;
  let userTwoToken: string;

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
        FinancialAccountsModule,
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

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  function accountPayload(name: string) {
    return {
      name,
      displayName: name,
      accountType: 'bank',
      currency: 'USD',
      openingBalance: 75,
    };
  }

  async function createAccount(name: string, token = userOneToken) {
    return request(app.getHttpServer())
      .post('/api/financial-accounts')
      .set('Authorization', `Bearer ${token}`)
      .send(accountPayload(name));
  }

  async function deleteAccount(id: number, token = userOneToken) {
    await request(app.getHttpServer())
      .delete(`/api/financial-accounts/${id}`)
      .set('Authorization', `Bearer ${token}`);
  }

  describe('POST /api/financial-accounts', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/financial-accounts')
        .send(accountPayload('Unauthenticated account'));

      expect(response.status).toBe(401);
    });

    it('creates an account for the authenticated user', async () => {
      const response = await createAccount('API-created account');

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'API-created account',
        displayName: 'API-created account',
        accountType: 'bank',
        currency: 'USD',
        openingBalance: 75,
        institutionName: null,
        accountNumberMasked: null,
        isActive: true,
        userId: 1,
      });
      expect(response.body.id).toEqual(expect.any(Number));

      await deleteAccount(response.body.id);
    });

    it('rejects a request that omits required account fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/financial-accounts')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ name: 'Incomplete account' });

      expect(response.status).toBe(400);
    });

    it('rejects properties outside the account request contract', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/financial-accounts')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ ...accountPayload('Invalid account'), userId: 2 });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/financial-accounts', () => {
    it('returns only accounts owned by the authenticated user with current balances', async () => {
      const created = await createAccount('API list owner account');
      expect(created.status).toBe(201);

      try {
        const ownerResponse = await request(app.getHttpServer())
          .get('/api/financial-accounts')
          .set('Authorization', `Bearer ${userOneToken}`);
        const otherUserResponse = await request(app.getHttpServer())
          .get('/api/financial-accounts')
          .set('Authorization', `Bearer ${userTwoToken}`);

        expect(ownerResponse.status).toBe(200);
        expect(ownerResponse.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: created.body.id,
              userId: 1,
              currentBalance: 75,
            }),
          ]),
        );
        expect(otherUserResponse.status).toBe(200);
        expect(otherUserResponse.body).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ id: created.body.id })]),
        );
      } finally {
        await deleteAccount(created.body.id);
      }
    });
  });

  describe('GET /api/financial-accounts/:id', () => {
    it('returns the current balance to the owner and hides the account from other users', async () => {
      const created = await createAccount('API single-account owner');
      expect(created.status).toBe(201);

      try {
        const ownerResponse = await request(app.getHttpServer())
          .get(`/api/financial-accounts/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`);
        const otherUserResponse = await request(app.getHttpServer())
          .get(`/api/financial-accounts/${created.body.id}`)
          .set('Authorization', `Bearer ${userTwoToken}`);

        expect(ownerResponse.status).toBe(200);
        expect(ownerResponse.body).toMatchObject({
          id: created.body.id,
          name: 'API single-account owner',
          userId: 1,
          currentBalance: 75,
        });
        expect(otherUserResponse.status).toBe(200);
        expect(otherUserResponse.body).not.toMatchObject({ id: created.body.id });
      } finally {
        await deleteAccount(created.body.id);
      }
    });

    it('rejects a non-numeric account ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/financial-accounts/not-a-number')
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/financial-accounts/:id', () => {
    it('rejects a non-numeric account ID', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/financial-accounts/not-a-number')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ displayName: 'Changed name' });

      expect(response.status).toBe(400);
    });

    it('updates an account for its owner and ignores another user’s update', async () => {
      const created = await createAccount('API account before update');
      expect(created.status).toBe(201);

      try {
        const unauthorizedResponse = await request(app.getHttpServer())
          .patch(`/api/financial-accounts/${created.body.id}`)
          .set('Authorization', `Bearer ${userTwoToken}`)
          .send({ displayName: 'Unauthorized update' });
        const ownerResponse = await request(app.getHttpServer())
          .get(`/api/financial-accounts/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`);

        expect(unauthorizedResponse.status).toBe(200);
        expect(unauthorizedResponse.body).not.toMatchObject({ id: created.body.id });
        expect(ownerResponse.body.displayName).toBe('API account before update');

        const updateResponse = await request(app.getHttpServer())
          .patch(`/api/financial-accounts/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`)
          .send({ displayName: 'API account after update' });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body).toMatchObject({
          id: created.body.id,
          displayName: 'API account after update',
          userId: 1,
        });
      } finally {
        await deleteAccount(created.body.id);
      }
    });

    it('rejects opening balance changes because that field is create-only', async () => {
      const created = await createAccount('API opening balance account');
      expect(created.status).toBe(201);

      try {
        const response = await request(app.getHttpServer())
          .patch(`/api/financial-accounts/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`)
          .send({ openingBalance: 1000 });

        expect(response.status).toBe(400);
      } finally {
        await deleteAccount(created.body.id);
      }
    });
  });

  describe('DELETE /api/financial-accounts/:id', () => {
    it('rejects a non-numeric account ID', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/financial-accounts/not-a-number')
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(response.status).toBe(400);
    });

    it('preserves an account for its owner when another user attempts deletion', async () => {
      const created = await createAccount('API protected account');
      expect(created.status).toBe(201);

      try {
        const deleteResponse = await request(app.getHttpServer())
          .delete(`/api/financial-accounts/${created.body.id}`)
          .set('Authorization', `Bearer ${userTwoToken}`);
        const ownerResponse = await request(app.getHttpServer())
          .get(`/api/financial-accounts/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`);

        expect(deleteResponse.status).toBe(200);
        expect(ownerResponse.body).toMatchObject({ id: created.body.id });
      } finally {
        await deleteAccount(created.body.id);
      }
    });

    it('deletes an account owned by the authenticated user', async () => {
      const created = await createAccount('API account to delete');
      expect(created.status).toBe(201);

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/financial-accounts/${created.body.id}`)
        .set('Authorization', `Bearer ${userOneToken}`);
      const getResponse = await request(app.getHttpServer())
        .get(`/api/financial-accounts/${created.body.id}`)
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body).not.toMatchObject({ id: created.body.id });
    });
  });
});