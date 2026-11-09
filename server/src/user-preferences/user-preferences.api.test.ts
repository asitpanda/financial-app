import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { UserPreferencesService } from './user-preferences.service';

describe('User Preferences API', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;
  const defaultPreferences = {
    currencyDisplay: 'symbol',
    themeMode: 'light',
    dateFormat: 'DD_MM_YYYY',
  } as const;

  beforeAll(async () => {
    const config: Record<string, string> = {
      DB_PROVIDER: 'mock', JWT_SECRET: 'preferences-api-signing-secret', JWT_EXPIRES_IN: '1h',
    };
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), AuthModule],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    })
      .overrideProvider(ConfigService).useValue({ get: (key: string) => config[key] })
      .overrideProvider(PrismaService).useValue({})
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    token = app.get(JwtService).sign({ sub: '1', email: 'demo@example.com' });
    otherToken = app.get(JwtService).sign({ sub: '2', email: 'other@example.com' });
  });

  beforeEach(async () => {
    await app.get(UserPreferencesService).update(1, defaultPreferences);
  });

  afterAll(async () => { if (app) await app.close(); });

  describe('GET /api/users/me/preferences', () => {
    it('requires authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/users/me/preferences');
      expect(response.status).toBe(401);
    });

    it('returns resolved defaults for an existing user', async () => {
      const response = await request(app.getHttpServer()).get('/api/users/me/preferences')
        .set('Authorization', `Bearer ${otherToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(defaultPreferences);
    });
  });

  describe('PATCH /api/users/me/preferences', () => {
    it('requires authentication before accepting changes', async () => {
      const response = await request(app.getHttpServer()).patch('/api/users/me/preferences')
        .send({ currencyDisplay: 'code' });
      expect(response.status).toBe(401);
    });

    it('saves for the authenticated user and restores the choice on later login without affecting another user', async () => {
      const saved = await request(app.getHttpServer()).patch('/api/users/me/preferences')
        .set('Authorization', `Bearer ${token}`).send({ currencyDisplay: 'code' });
      expect(saved.status).toBe(200);
      expect(saved.body).toEqual({ ...defaultPreferences, currencyDisplay: 'code' });
      const profile = await request(app.getHttpServer()).get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(profile.body.preferences).toEqual({ ...defaultPreferences, currencyDisplay: 'code' });
      const login = await request(app.getHttpServer()).post('/api/auth/login')
        .send({ identifier: 'demo@example.com', password: '123456' });
      expect(login.body.preferences).toEqual({ ...defaultPreferences, currencyDisplay: 'code' });
      const other = await request(app.getHttpServer()).get('/api/users/me/preferences')
        .set('Authorization', `Bearer ${otherToken}`);
      expect(other.status).toBe(200);
      expect(other.body).toEqual(defaultPreferences);
    });

    it.each([
      { currencyDisplay: 'name' },
      { currencyDisplay: null },
      { currencyDisplay: 'code', userId: 2 },
      { defaultCurrency: 'USD' },
    ])('rejects unsupported values and fields: %j', async (payload) => {
      const response = await request(app.getHttpServer()).patch('/api/users/me/preferences')
        .set('Authorization', `Bearer ${token}`).send(payload);
      expect(response.status).toBe(400);
      expect(await app.get(UserPreferencesService).get(1)).toEqual(defaultPreferences);
    });

    it('preserves the saved choice for an empty patch', async () => {
      const savedPreferences = {
        currencyDisplay: 'code',
        themeMode: 'dark',
        dateFormat: 'YYYY_MM_DD',
      } as const;
      await app.get(UserPreferencesService).update(1, savedPreferences);
      const response = await request(app.getHttpServer()).patch('/api/users/me/preferences')
        .set('Authorization', `Bearer ${token}`).send({});
      expect(response.status).toBe(200);
      expect(response.body).toEqual(savedPreferences);
    });
  });
});