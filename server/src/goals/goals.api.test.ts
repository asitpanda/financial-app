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
import { GoalsModule } from './goals.module';

const jwtSecret = 'goals-api-test-signing-secret';

describe('Goals API', () => {
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
        GoalsModule,
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

  function goalPayload(name: string) {
    return {
      name,
      categoryId: 1,
      categoryLabelSnapshot: 'Savings',
      targetAmount: 5000,
    };
  }

  async function createGoal(name: string, token = userOneToken) {
    return request(app.getHttpServer())
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send(goalPayload(name));
  }

  async function deleteGoal(id: number, token = userOneToken) {
    await request(app.getHttpServer())
      .delete(`/api/goals/${id}`)
      .set('Authorization', `Bearer ${token}`);
  }

  describe('POST /api/goals', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/goals')
        .send(goalPayload('Unauthenticated goal'));

      expect(response.status).toBe(401);
    });

    it('creates a goal for the authenticated user', async () => {
      const response = await createGoal('API-created goal');

      try {
        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          name: 'API-created goal',
          categoryId: 1,
          categoryLabelSnapshot: 'Savings',
          targetAmount: 5000,
          currentAmount: 0,
          icon: 'gift',
          description: null,
          userId: 1,
        });
        expect(response.body.id).toEqual(expect.any(Number));
      } finally {
        if (response.body.id) {
          await deleteGoal(response.body.id);
        }
      }
    });

    it('rejects requests missing required goal fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/goals')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ name: 'Incomplete goal' });

      expect(response.status).toBe(400);
    });

    it('rejects properties outside the goal request contract', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/goals')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ ...goalPayload('Invalid goal'), userId: 2 });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/goals', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/goals');

      expect(response.status).toBe(401);
    });

    it('returns only goals owned by the authenticated user', async () => {
      const created = await createGoal('API list owner goal');
      expect(created.status).toBe(201);

      try {
        const ownerResponse = await request(app.getHttpServer())
          .get('/api/goals')
          .set('Authorization', `Bearer ${userOneToken}`);
        const otherUserResponse = await request(app.getHttpServer())
          .get('/api/goals')
          .set('Authorization', `Bearer ${userTwoToken}`);

        expect(ownerResponse.status).toBe(200);
        expect(ownerResponse.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: created.body.id, userId: 1 }),
          ]),
        );
        expect(otherUserResponse.status).toBe(200);
        expect(otherUserResponse.body).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ id: created.body.id })]),
        );
      } finally {
        await deleteGoal(created.body.id);
      }
    });
  });

  describe('GET /api/goals/:id', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/goals/1');

      expect(response.status).toBe(401);
    });

    it('returns a goal to its owner and hides it from other users', async () => {
      const created = await createGoal('API single-goal owner');
      expect(created.status).toBe(201);

      try {
        const ownerResponse = await request(app.getHttpServer())
          .get(`/api/goals/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`);
        const otherUserResponse = await request(app.getHttpServer())
          .get(`/api/goals/${created.body.id}`)
          .set('Authorization', `Bearer ${userTwoToken}`);

        expect(ownerResponse.status).toBe(200);
        expect(ownerResponse.body).toMatchObject({
          id: created.body.id,
          name: 'API single-goal owner',
          userId: 1,
        });
        expect(otherUserResponse.status).toBe(200);
        expect(otherUserResponse.body).not.toMatchObject({ id: created.body.id });
      } finally {
        await deleteGoal(created.body.id);
      }
    });

    it('rejects a non-numeric goal ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/goals/not-a-number')
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/goals/:id', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/goals/1')
        .send({ name: 'Changed goal' });

      expect(response.status).toBe(401);
    });

    it("updates a goal for its owner and ignores another user's update", async () => {
      const created = await createGoal('API goal before update');
      expect(created.status).toBe(201);

      try {
        const unauthorizedResponse = await request(app.getHttpServer())
          .patch(`/api/goals/${created.body.id}`)
          .set('Authorization', `Bearer ${userTwoToken}`)
          .send({ name: 'Unauthorized update' });
        const ownerResponse = await request(app.getHttpServer())
          .get(`/api/goals/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`);

        expect(unauthorizedResponse.status).toBe(200);
        expect(unauthorizedResponse.body).not.toMatchObject({ id: created.body.id });
        expect(ownerResponse.body.name).toBe('API goal before update');

        const updateResponse = await request(app.getHttpServer())
          .patch(`/api/goals/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`)
          .send({ name: 'API goal after update' });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body).toMatchObject({
          id: created.body.id,
          name: 'API goal after update',
          userId: 1,
        });
      } finally {
        await deleteGoal(created.body.id);
      }
    });
  });

  describe('DELETE /api/goals/:id', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer()).delete('/api/goals/1');

      expect(response.status).toBe(401);
    });

    it('preserves a goal when another user attempts deletion', async () => {
      const created = await createGoal('API protected goal');
      expect(created.status).toBe(201);

      try {
        const deleteResponse = await request(app.getHttpServer())
          .delete(`/api/goals/${created.body.id}`)
          .set('Authorization', `Bearer ${userTwoToken}`);
        const ownerResponse = await request(app.getHttpServer())
          .get(`/api/goals/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`);

        expect(deleteResponse.status).toBe(200);
        expect(ownerResponse.body).toMatchObject({ id: created.body.id });
      } finally {
        await deleteGoal(created.body.id);
      }
    });

    it('deletes a goal owned by the authenticated user', async () => {
      const created = await createGoal('API goal to delete');
      expect(created.status).toBe(201);

      try {
        const deleteResponse = await request(app.getHttpServer())
          .delete(`/api/goals/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`);
        const getResponse = await request(app.getHttpServer())
          .get(`/api/goals/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`);

        expect(deleteResponse.status).toBe(200);
        expect(getResponse.body).not.toMatchObject({ id: created.body.id });
      } finally {
        await deleteGoal(created.body.id);
      }
    });
  });
});