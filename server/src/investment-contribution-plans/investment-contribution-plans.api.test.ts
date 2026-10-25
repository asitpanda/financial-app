import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InvestmentEventType } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { InvestmentContributionPlansModule } from './investment-contribution-plans.module';

const jwtSecret = 'investment-contribution-plans-api-test-signing-secret';

describe('Investment Contribution Plans API', () => {
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
        InvestmentContributionPlansModule,
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
    ownerToken = jwtService.sign({ sub: '1', email: 'owner@example.com' });
    otherUserToken = jwtService.sign({ sub: '2', email: 'other@example.com' });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function planPayload(overrides: Record<string, unknown> = {}) {
    return {
      investmentId: '2',
      status: 'paused',
      amount: 100,
      cadenceUnit: 'day',
      cadenceInterval: 1,
      anchorDate: today(),
      ...overrides,
    };
  }

  async function createPlan(overrides: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post('/api/investments/2/contribution-plans')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(planPayload(overrides));
  }

  async function deletePlan(investmentId: string, planId: number) {
    await request(app.getHttpServer())
      .delete(`/api/investments/${investmentId}/contribution-plans/${planId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
  }

  describe('POST /api/investments/:investmentId/contribution-plans', () => {
    it('requires authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investments/2/contribution-plans')
        .send(planPayload());

      expect(response.status).toBe(401);
    });

    it('creates a plan for the authenticated owner', async () => {
      const response = await createPlan({ status: 'active' });

      try {
        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          investmentId: 2,
          status: 'active',
          amount: 100,
          cadenceUnit: 'day',
        });
        expect(response.body.id).toEqual(expect.any(Number));
      } finally {
        if (response.body.id) await deletePlan('2', response.body.id);
      }
    });

    it('rejects invalid amounts and fields outside the request contract', async () => {
      const invalidAmount = await createPlan({ amount: 0 });
      const unknownField = await createPlan({ userId: 2 });

      expect(invalidAmount.status).toBe(400);
      expect(unknownField.status).toBe(400);
    });

    it('hides an investment owned by another user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investments/2/contribution-plans')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(planPayload());

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/investments/:investmentId/contribution-plans/preview', () => {
    it('returns opening-balance occurrences without creating a plan', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investments/2/contribution-plans/preview')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 100,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: today(),
          historicalImportMode: 'OPENING_BALANCE',
          openingPrincipalAmount: 500,
          openingIncomeAmount: 25,
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        investmentId: '2',
        historicalOccurrenceCount: 2,
        expectedHistoricalTotal: 525,
        occurrences: [
          { amount: 500, eventType: InvestmentEventType.OPENING_BALANCE },
          { amount: 25, eventType: InvestmentEventType.OPENING_INCOME_CREDIT },
        ],
      });
    });
  });

  describe('POST /api/investments/:investmentId/contribution-plans/confirm', () => {
    it('creates a plan from a valid confirmation request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investments/2/contribution-plans/confirm')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 100,
          cadenceUnit: 'day',
          cadenceInterval: 1,
          anchorDate: today(),
          historicalImportMode: 'TRACK_FROM_TODAY',
        });

      try {
        expect(response.status).toBe(201);
        expect(response.body.plan).toMatchObject({ investmentId: 2, status: 'active', amount: 100 });
        expect(response.body.historicalEvents).toEqual([]);
      } finally {
        if (response.body.plan?.id) await deletePlan('2', response.body.plan.id);
      }
    });
  });

  describe('POST /api/investments/:investmentId/contribution-plans/:id/skip-current', () => {
    it('skips the current due occurrence and returns the updated plan', async () => {
      const created = await createPlan({
        status: 'active',
        nextDueDate: today(),
      });
      expect(created.status).toBe(201);

      try {
        const response = await request(app.getHttpServer())
          .post(`/api/investments/2/contribution-plans/${created.body.id}/skip-current`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ notes: 'Scheduled payment postponed' });

        expect(response.status).toBe(201);
        expect(response.body.skippedEvent).toMatchObject({
          status: 'SKIPPED',
          notes: 'Scheduled payment postponed',
        });
        expect(response.body.plan.nextDueDate).toBeTruthy();
      } finally {
        if (created.body.id) await deletePlan('2', created.body.id);
      }
    });
  });

  describe('GET /api/investments/:investmentId/contribution-plans', () => {
    it('returns plans to the owner and hides another user’s investment', async () => {
      const ownerResponse = await request(app.getHttpServer())
        .get('/api/investments/1/contribution-plans')
        .set('Authorization', `Bearer ${ownerToken}`);
      const otherUserResponse = await request(app.getHttpServer())
        .get('/api/investments/1/contribution-plans')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ investmentId: 1 })]),
      );
      expect(otherUserResponse.status).toBe(404);
    });
  });

  describe('GET /api/investments/:investmentId/contribution-plans/:id', () => {
    it('returns a plan to its owner and hides it from another user', async () => {
      const ownerResponse = await request(app.getHttpServer())
        .get('/api/investments/1/contribution-plans/1')
        .set('Authorization', `Bearer ${ownerToken}`);
      const otherUserResponse = await request(app.getHttpServer())
        .get('/api/investments/1/contribution-plans/1')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toMatchObject({ id: 1, investmentId: 1 });
      expect(otherUserResponse.status).toBe(404);
    });
  });

  describe('PATCH /api/investments/:investmentId/contribution-plans/:id', () => {
    it('updates a plan for its owner and rejects another user’s update', async () => {
      const created = await createPlan();
      expect(created.status).toBe(201);

      try {
        const otherUserResponse = await request(app.getHttpServer())
          .patch(`/api/investments/2/contribution-plans/${created.body.id}`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .send({ amount: 150 });
        const ownerResponse = await request(app.getHttpServer())
          .patch(`/api/investments/2/contribution-plans/${created.body.id}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ amount: 150 });

        expect(otherUserResponse.status).toBe(404);
        expect(ownerResponse.status).toBe(200);
        expect(ownerResponse.body).toMatchObject({ id: created.body.id, amount: 150 });
      } finally {
        if (created.body.id) await deletePlan('2', created.body.id);
      }
    });
  });

  describe('DELETE /api/investments/:investmentId/contribution-plans/:id', () => {
    it('deletes a plan for its owner', async () => {
      const created = await createPlan();
      expect(created.status).toBe(201);

      const response = await request(app.getHttpServer())
        .delete(`/api/investments/2/contribution-plans/${created.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      const listResponse = await request(app.getHttpServer())
        .get('/api/investments/2/contribution-plans')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: created.body.id })]),
      );
    });
  });
});