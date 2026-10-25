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
import { InvestmentAssetTaxonomyModule } from './investment-asset-taxonomy.module';

const jwtSecret = 'investment-asset-taxonomy-api-test-signing-secret';
const createdNodeIdsByToken = new Map<string, number[]>();

describe('Investment Asset Taxonomy API', () => {
  let app: INestApplication;
  let ownerToken: string;
  let otherUserToken: string;

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
        InvestmentAssetTaxonomyModule,
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
    ownerToken = jwtService.sign({ sub: '1', email: 'demo@example.com' });
    otherUserToken = jwtService.sign({ sub: '2', email: 'demo2@example.com' });
  });

  afterAll(async () => {
    if (app) {
      try {
        await cleanupUserNodes(ownerToken);
        await cleanupUserNodes(otherUserToken);
      } finally {
        await app.close();
      }
    }
  });

  async function cleanupUserNodes(token: string) {
    for (const id of createdNodeIdsByToken.get(token) ?? []) {
      await request(app.getHttpServer())
        .delete(`/api/investment-asset-taxonomy/${id}`)
        .set('Authorization', `Bearer ${token}`);
    }
  }

  async function createNode(
    label: string,
    token = ownerToken,
    options: { level?: number | string; parentId?: number | string } = {},
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/investment-asset-taxonomy')
      .set('Authorization', `Bearer ${token}`)
      .send({
        label,
        nodeType: 'CATEGORY',
        level: options.level ?? '1',
        ...(options.parentId !== undefined ? { parentId: String(options.parentId) } : {}),
      });

    if (response.status === 201 && response.body.id) {
      const ids = createdNodeIdsByToken.get(token) ?? [];
      ids.push(response.body.id);
      createdNodeIdsByToken.set(token, ids);
    }
    return response;
  }

  describe('POST /api/investment-asset-taxonomy', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investment-asset-taxonomy')
        .send({ label: 'Unauthenticated node', nodeType: 'CATEGORY', level: 1 });

      expect(response.status).toBe(401);
    });

    it('creates nested nodes for the authenticated user and transforms numeric fields', async () => {
      const parentResponse = await createNode('API taxonomy parent', ownerToken, {
        level: '1',
      });
      expect(parentResponse.status).toBe(201);

      const childResponse = await createNode('API taxonomy child', ownerToken, {
        level: '2',
        parentId: parentResponse.body.id,
      });

      expect(childResponse.status).toBe(201);
      expect(childResponse.body).toMatchObject({
        label: 'API taxonomy child',
        nodeType: 'CATEGORY',
        userId: 1,
        parentId: parentResponse.body.id,
        level: 2,
        defaultAssetType: null,
        defaultAssetCategory: null,
        sortOrder: 0,
        isActive: true,
      });
      expect(childResponse.body.id).toEqual(expect.any(Number));
    });

    it('rejects levels outside the supported range', async () => {
      const response = await createNode('Invalid level node', ownerToken, { level: 6 });

      expect(response.status).toBe(400);
    });

    it('rejects fields outside the request contract', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investment-asset-taxonomy')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ label: 'Invalid owner field', nodeType: 'CATEGORY', level: 1, userId: 2 });

      expect(response.status).toBe(400);
    });

    it('maps a missing nested parent rule to a bad request response', async () => {
      const response = await createNode('Orphan taxonomy node', ownerToken, { level: 2 });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        message: 'Parent is required for nested nodes',
        field: 'parentId',
      });
    });
  });

  describe('GET /api/investment-asset-taxonomy', () => {
    it('returns only nodes belonging to the authenticated user', async () => {
      const ownerNode = await createNode('Owner-scoped taxonomy node');
      const otherNode = await createNode('Other-user taxonomy node', otherUserToken);

      expect(ownerNode.status).toBe(201);
      expect(otherNode.status).toBe(201);

      const ownerResponse = await request(app.getHttpServer())
        .get('/api/investment-asset-taxonomy')
        .set('Authorization', `Bearer ${ownerToken}`);
      const otherUserResponse = await request(app.getHttpServer())
        .get('/api/investment-asset-taxonomy')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: ownerNode.body.id, userId: 1 }),
        ]),
      );
      expect(ownerResponse.body).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: otherNode.body.id })]),
      );
      expect(otherUserResponse.status).toBe(200);
      expect(otherUserResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: otherNode.body.id, userId: 2 }),
        ]),
      );
    });
  });

  describe('GET /api/investment-asset-taxonomy/:id', () => {
    it('returns a node to its owner without exposing it to another user', async () => {
      const created = await createNode('Single-node owner scope');
      expect(created.status).toBe(201);

      const ownerResponse = await request(app.getHttpServer())
        .get(`/api/investment-asset-taxonomy/${created.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      const otherUserResponse = await request(app.getHttpServer())
        .get(`/api/investment-asset-taxonomy/${created.body.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toMatchObject({
        id: created.body.id,
        label: 'Single-node owner scope',
        userId: 1,
      });
      expect(otherUserResponse.text).not.toContain('Single-node owner scope');
    });

    it('rejects a non-numeric node ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/investment-asset-taxonomy/not-a-number')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/investment-asset-taxonomy/:id', () => {
    it('updates a node for its owner and ignores another user’s update', async () => {
      const created = await createNode('Taxonomy node before update');
      expect(created.status).toBe(201);

      const otherUserResponse = await request(app.getHttpServer())
        .patch(`/api/investment-asset-taxonomy/${created.body.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ label: 'Unauthorized taxonomy update' });
      const ownerResponse = await request(app.getHttpServer())
        .patch(`/api/investment-asset-taxonomy/${created.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ label: 'Taxonomy node after update' });

      expect(otherUserResponse.status).toBe(200);
      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toMatchObject({
        id: created.body.id,
        label: 'Taxonomy node after update',
        userId: 1,
      });
    });

    it('rejects a non-numeric node ID', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/investment-asset-taxonomy/not-a-number')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ label: 'Changed node' });

      expect(response.status).toBe(400);
    });

    it('rejects invalid update fields', async () => {
      const created = await createNode('Taxonomy node for invalid update');
      expect(created.status).toBe(201);

      const response = await request(app.getHttpServer())
        .patch(`/api/investment-asset-taxonomy/${created.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ level: 6 });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/investment-asset-taxonomy/:id', () => {
    it('preserves a node when another user attempts deletion and removes it for its owner', async () => {
      const created = await createNode('Taxonomy node to delete');
      expect(created.status).toBe(201);

      const otherUserResponse = await request(app.getHttpServer())
        .delete(`/api/investment-asset-taxonomy/${created.body.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);
      const ownerGetResponse = await request(app.getHttpServer())
        .get(`/api/investment-asset-taxonomy/${created.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      const ownerDeleteResponse = await request(app.getHttpServer())
        .delete(`/api/investment-asset-taxonomy/${created.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      const afterDeleteResponse = await request(app.getHttpServer())
        .get(`/api/investment-asset-taxonomy/${created.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(otherUserResponse.status).toBe(200);
      expect(ownerGetResponse.body).toMatchObject({ id: created.body.id });
      expect(ownerDeleteResponse.status).toBe(200);
      expect(afterDeleteResponse.text).not.toContain('Taxonomy node to delete');
    });

    it('rejects a non-numeric node ID', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/investment-asset-taxonomy/not-a-number')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(400);
    });
  });
});
