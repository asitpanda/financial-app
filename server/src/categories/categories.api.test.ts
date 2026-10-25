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
import { CategoriesModule } from './categories.module';

const jwtSecret = 'categories-api-test-signing-secret';

describe('Categories API', () => {
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
        CategoriesModule,
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

  async function createCategory(name: string, token = userOneToken) {
    return request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, type: 'expense' });
  }

  describe('POST /api/categories', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/categories')
        .send({ name: 'Unauthenticated category', type: 'expense' });

      expect(response.status).toBe(401);
    });

    it('creates a category for the authenticated user', async () => {
      const response = await createCategory('API-created category');

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'API-created category',
        type: 'expense',
        icon: null,
        color: null,
        isSystem: false,
        userId: 1,
      });
      expect(response.body.id).toEqual(expect.any(Number));
    });

    it('rejects an invalid category type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ name: 'Invalid category', type: 'transfer' });

      expect(response.status).toBe(400);
    });

    it('rejects properties that are not part of the request DTO', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ name: 'Invalid category', type: 'expense', userId: 2 });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/categories', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/categories');

      expect(response.status).toBe(401);
    });

    it('returns only categories owned by the authenticated user', async () => {
      const created = await createCategory('API owner-scoped category');
      expect(created.status).toBe(201);

      const ownerResponse = await request(app.getHttpServer())
        .get('/api/categories')
        .set('Authorization', `Bearer ${userOneToken}`);
      const otherUserResponse = await request(app.getHttpServer())
        .get('/api/categories')
        .set('Authorization', `Bearer ${userTwoToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: created.body.id, userId: 1 }),
        ]),
      );
      expect(otherUserResponse.status).toBe(200);
      expect(otherUserResponse.body).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: created.body.id }),
        ]),
      );
    });
  });

  describe('GET /api/categories/:id', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/categories/1');

      expect(response.status).toBe(401);
    });

    it('returns a category to its owner and hides it from other users', async () => {
      const created = await createCategory('API single-category owner');

      const ownerResponse = await request(app.getHttpServer())
        .get(`/api/categories/${created.body.id}`)
        .set('Authorization', `Bearer ${userOneToken}`);
      const otherUserResponse = await request(app.getHttpServer())
        .get(`/api/categories/${created.body.id}`)
        .set('Authorization', `Bearer ${userTwoToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toMatchObject({
        id: created.body.id,
        name: 'API single-category owner',
        userId: 1,
      });
      expect(otherUserResponse.status).toBe(200);
      expect(otherUserResponse.body).not.toMatchObject({ id: created.body.id });
    });

    it('rejects a non-numeric category ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/categories/not-a-number')
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/categories/:id', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/categories/1')
        .send({ name: 'Changed' });

      expect(response.status).toBe(401);
    });

    it('rejects a non-numeric category ID', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/categories/not-a-number')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ name: 'Changed' });

      expect(response.status).toBe(400);
    });

    it('rejects an invalid category type', async () => {
      const created = await createCategory('API category with invalid update');

      const response = await request(app.getHttpServer())
        .patch(`/api/categories/${created.body.id}`)
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ type: 'transfer' });

      expect(response.status).toBe(400);
    });

    it('updates a category owned by the authenticated user', async () => {
      const created = await createCategory('API category before update');

      const response = await request(app.getHttpServer())
        .patch(`/api/categories/${created.body.id}`)
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ name: 'API category after update' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.body.id,
        name: 'API category after update',
        userId: 1,
      });
    });

    it('does not update a category owned by another user', async () => {
      const created = await createCategory('API protected category');

      const response = await request(app.getHttpServer())
        .patch(`/api/categories/${created.body.id}`)
        .set('Authorization', `Bearer ${userTwoToken}`)
        .send({ name: 'API unauthorized change' });
      const ownerResponse = await request(app.getHttpServer())
        .get(`/api/categories/${created.body.id}`)
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(response.status).toBe(200);
      expect(response.body).not.toMatchObject({ id: created.body.id });
      expect(ownerResponse.body.name).toBe('API protected category');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer()).delete('/api/categories/1');

      expect(response.status).toBe(401);
    });

    it('rejects a non-numeric category ID', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/categories/not-a-number')
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(response.status).toBe(400);
    });

    it('does not delete a category owned by another user', async () => {
      const created = await createCategory('API category protected from deletion');

      const response = await request(app.getHttpServer())
        .delete(`/api/categories/${created.body.id}`)
        .set('Authorization', `Bearer ${userTwoToken}`);
      const ownerResponse = await request(app.getHttpServer())
        .get(`/api/categories/${created.body.id}`)
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(response.status).toBe(200);
      expect(ownerResponse.body).toMatchObject({ id: created.body.id });
    });

    it('deletes a category owned by the authenticated user', async () => {
      const created = await createCategory('API category to delete');

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/categories/${created.body.id}`)
        .set('Authorization', `Bearer ${userOneToken}`);
      const getResponse = await request(app.getHttpServer())
        .get(`/api/categories/${created.body.id}`)
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body).not.toMatchObject({ id: created.body.id });
    });
  });

});