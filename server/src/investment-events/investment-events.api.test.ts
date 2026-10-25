import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InvestmentEventType } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { InvestmentEventsModule } from './investment-events.module';

const jwtSecret = 'investment-events-api-test-signing-secret';

describe('Investment Events API', () => {
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
        InvestmentEventsModule,
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
    userOneToken = jwtService.sign({ sub: '1', email: 'owner@example.com' });
    userTwoToken = jwtService.sign({ sub: '2', email: 'other@example.com' });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  function eventPayload() {
    return {
      eventType: InvestmentEventType.CONTRIBUTION,
      eventDate: '2026-10-25T00:00:00.000Z',
      amount: 25,
      status: 'PENDING',
    };
  }

  async function createEvent(token = userOneToken) {
    return request(app.getHttpServer())
      .post('/api/investments/5/events')
      .set('Authorization', `Bearer ${token}`)
      .send(eventPayload());
  }

  async function deleteEvent(id: number) {
    await request(app.getHttpServer())
      .delete(`/api/investments/5/events/${id}`)
      .set('Authorization', `Bearer ${userOneToken}`);
  }

  describe('POST /api/investments/:investmentId/events', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investments/5/events')
        .send(eventPayload());

      expect(response.status).toBe(401);
    });

    it('creates an event for the authenticated investment owner', async () => {
      const response = await createEvent();

      try {
        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          investmentId: 5,
          eventType: InvestmentEventType.CONTRIBUTION,
          eventDate: '2026-10-25T00:00:00.000Z',
          amount: 25,
          status: 'PENDING',
          eventSource: 'MANUAL',
        });
        expect(response.body.id).toEqual(expect.any(Number));
      } finally {
        if (response.body.id) await deleteEvent(response.body.id);
      }
    });

    it('rejects invalid event types and fields outside the request contract', async () => {
      const invalidType = await request(app.getHttpServer())
        .post('/api/investments/5/events')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ ...eventPayload(), eventType: 'NOT_AN_EVENT' });
      const extraField = await request(app.getHttpServer())
        .post('/api/investments/5/events')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ ...eventPayload(), userId: 2 });

      expect(invalidType.status).toBe(400);
      expect(extraField.status).toBe(400);
    });

    it('hides an investment owned by another user', async () => {
      const response = await createEvent(userTwoToken);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/investments/:investmentId/events', () => {
    it("returns events for an owned investment and hides another user's investment", async () => {
      const ownerResponse = await request(app.getHttpServer())
        .get('/api/investments/5/events')
        .set('Authorization', `Bearer ${userOneToken}`);
      const otherUserResponse = await request(app.getHttpServer())
        .get('/api/investments/5/events')
        .set('Authorization', `Bearer ${userTwoToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 3, investmentId: 5 })]),
      );
      expect(otherUserResponse.status).toBe(404);
    });
  });

  describe('GET /api/investments/:investmentId/events/:eventId', () => {
    it('returns an event to its owner and rejects another user or a non-numeric ID', async () => {
      const ownerResponse = await request(app.getHttpServer())
        .get('/api/investments/5/events/3')
        .set('Authorization', `Bearer ${userOneToken}`);
      const otherUserResponse = await request(app.getHttpServer())
        .get('/api/investments/5/events/3')
        .set('Authorization', `Bearer ${userTwoToken}`);
      const invalidIdResponse = await request(app.getHttpServer())
        .get('/api/investments/5/events/not-a-number')
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toMatchObject({ id: 3, investmentId: 5 });
      expect(otherUserResponse.status).toBe(404);
      expect(invalidIdResponse.status).toBe(400);
    });
  });

  describe('PATCH /api/investments/:investmentId/events/:eventId', () => {
    it("updates an event for its owner and rejects another user's update", async () => {
      const created = await createEvent();
      expect(created.status).toBe(201);

      try {
        const otherUserResponse = await request(app.getHttpServer())
          .patch(`/api/investments/5/events/${created.body.id}`)
          .set('Authorization', `Bearer ${userTwoToken}`)
          .send({ notes: 'Unauthorized change' });
        const ownerResponse = await request(app.getHttpServer())
          .patch(`/api/investments/5/events/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`)
          .send({ notes: 'Updated event' });

        expect(otherUserResponse.status).toBe(404);
        expect(ownerResponse.status).toBe(200);
        expect(ownerResponse.body).toMatchObject({ id: created.body.id, notes: 'Updated event' });
      } finally {
        if (created.body.id) await deleteEvent(created.body.id);
      }
    });
  });

  describe('DELETE /api/investments/:investmentId/events/:eventId', () => {
    it('rejects deletion by another user and deletes the event for its owner', async () => {
      const created = await createEvent();
      expect(created.status).toBe(201);

      const otherUserResponse = await request(app.getHttpServer())
        .delete(`/api/investments/5/events/${created.body.id}`)
        .set('Authorization', `Bearer ${userTwoToken}`);
      const ownerResponse = await request(app.getHttpServer())
        .delete(`/api/investments/5/events/${created.body.id}`)
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(otherUserResponse.status).toBe(404);
      expect(ownerResponse.status).toBe(200);
    });
  });
});