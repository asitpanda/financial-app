import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthModule } from './auth.module';
import { PrismaService } from '../database/prisma.service';
import { registeredUsers } from '../mockdata';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const jwtSecret = 'auth-api-test-signing-secret';
const initialUsers = registeredUsers.map((user) => ({ ...user }));

describe('Auth API', () => {
  let app: INestApplication;

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
          load: [
            () => ({
              DB_PROVIDER: 'mock',
              JWT_SECRET: jwtSecret,
              JWT_EXPIRES_IN: '1h',
            }),
          ],
        }),
        AuthModule,
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
  });

  beforeEach(() => {
    registeredUsers.splice(
      0,
      registeredUsers.length,
      ...initialUsers.map((user) => ({ ...user })),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/auth/register', () => {
    it('creates an account and returns only its public profile and token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          password: 'strong-password',
          name: 'New User',
          mobile: '+15550000000',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        user: { id: 3, email: 'new@example.com', name: 'New User' },
        token: expect.any(String),
      });
    });

    it('rejects a duplicate email with a conflict response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'demo@example.com', password: 'strong-password' });

      expect(response.status).toBe(409);
    });

    it('rejects an invalid registration payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'short' });

      expect(response.status).toBe(400);
    });

    it('rejects a malformed phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          password: 'strong-password',
          mobile: '12345abcde',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns a public profile and bearer token for valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: 'demo@example.com', password: '123456' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        user: { id: 1, email: 'demo@example.com', name: 'Demo User' },
        token: expect.any(String),
      });
    });

    it('rejects invalid credentials with an unauthorized response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: 'missing@example.com', password: 'wrong-password' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('rejects a request without a bearer token', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('returns the current profile for a bearer token issued by login', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: 'demo@example.com', password: '123456' });
      const profileResponse = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.token}`);

      expect(loginResponse.status).toBe(201);
      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body).toEqual({
        id: 1,
        email: 'demo@example.com',
        name: 'Demo User',
      });
    });
  });
});