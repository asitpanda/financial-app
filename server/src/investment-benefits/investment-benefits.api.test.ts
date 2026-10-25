import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InvestmentBenefitStatus, InvestmentBenefitType } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { InvestmentBenefitsModule } from './investment-benefits.module';

const jwtSecret = 'investment-benefits-api-test-signing-secret';

describe('Investment Benefits API', () => {
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
        InvestmentBenefitsModule,
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

  function benefitPayload(amount = 25) {
    return {
      benefitType: InvestmentBenefitType.COUPON,
      amount,
      benefitDate: '2026-12-01T00:00:00.000Z',
    };
  }

  async function createBenefit(amount = 25) {
    return request(app.getHttpServer())
      .post('/api/investments/5/benefits')
      .set('Authorization', `Bearer ${userOneToken}`)
      .send(benefitPayload(amount));
  }

  async function deleteBenefit(id: number) {
    await request(app.getHttpServer())
      .delete(`/api/investments/5/benefits/${id}`)
      .set('Authorization', `Bearer ${userOneToken}`);
  }

  describe('POST /api/investments/:investmentId/benefits', () => {
    it('rejects a request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investments/5/benefits')
        .send(benefitPayload());

      expect(response.status).toBe(401);
    });

    it('creates a benefit for the authenticated investment owner', async () => {
      const response = await createBenefit();

      try {
        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          investmentId: 5,
          benefitType: InvestmentBenefitType.COUPON,
          amount: 25,
          benefitDate: '2026-12-01T00:00:00.000Z',
          status: InvestmentBenefitStatus.EXPECTED,
          destinationAccountId: null,
          notes: null,
        });
        expect(response.body.id).toEqual(expect.any(Number));
      } finally {
        if (response.body.id) await deleteBenefit(response.body.id);
      }
    });

    it('rejects an invalid amount and fields outside the request contract', async () => {
      const invalidAmount = await request(app.getHttpServer())
        .post('/api/investments/5/benefits')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send(benefitPayload(-1));
      const extraField = await request(app.getHttpServer())
        .post('/api/investments/5/benefits')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ ...benefitPayload(), userId: 2 });

      expect(invalidAmount.status).toBe(400);
      expect(extraField.status).toBe(400);
    });

    it('rejects creation for an investment owned by another user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investments/5/benefits')
        .set('Authorization', `Bearer ${userTwoToken}`)
        .send(benefitPayload());

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/investment-benefits', () => {
    it('returns benefits only for the authenticated user', async () => {
      const ownerResponse = await request(app.getHttpServer())
        .get('/api/investment-benefits')
        .set('Authorization', `Bearer ${userOneToken}`);
      const otherUserResponse = await request(app.getHttpServer())
        .get('/api/investment-benefits')
        .set('Authorization', `Bearer ${userTwoToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ investmentId: 5 })]),
      );
      expect(otherUserResponse.status).toBe(200);
      expect(otherUserResponse.body).toEqual([]);
    });
  });

  describe('GET /api/investments/:investmentId/benefits', () => {
    it("returns benefits for an owned investment and hides another user's investment", async () => {
      const ownerResponse = await request(app.getHttpServer())
        .get('/api/investments/5/benefits')
        .set('Authorization', `Bearer ${userOneToken}`);
      const otherUserResponse = await request(app.getHttpServer())
        .get('/api/investments/5/benefits')
        .set('Authorization', `Bearer ${userTwoToken}`);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 101, investmentId: 5 })]),
      );
      expect(otherUserResponse.status).toBe(404);
    });
  });

  describe('GET /api/investments/:investmentId/benefits/:benefitId', () => {
    it('returns benefit details to the owner and rejects a non-numeric benefit ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/investments/5/benefits/101')
        .set('Authorization', `Bearer ${userOneToken}`);
      const invalidIdResponse = await request(app.getHttpServer())
        .get('/api/investments/5/benefits/not-a-number')
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: 101, investmentId: 5, realizedEvents: expect.any(Array) });
      expect(invalidIdResponse.status).toBe(400);
    });
  });

  describe('PATCH /api/investments/:investmentId/benefits/:benefitId', () => {
    it("updates a benefit for its owner and rejects another user's update", async () => {
      const created = await createBenefit();
      expect(created.status).toBe(201);

      try {
        const otherUserResponse = await request(app.getHttpServer())
          .patch(`/api/investments/5/benefits/${created.body.id}`)
          .set('Authorization', `Bearer ${userTwoToken}`)
          .send({ amount: 30 });
        const ownerResponse = await request(app.getHttpServer())
          .patch(`/api/investments/5/benefits/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`)
          .send({ amount: 30 });

        expect(otherUserResponse.status).toBe(404);
        expect(ownerResponse.status).toBe(200);
        expect(ownerResponse.body).toMatchObject({ id: created.body.id, amount: 30 });
      } finally {
        await deleteBenefit(created.body.id);
      }
    });
  });

  describe('DELETE /api/investments/:investmentId/benefits/:benefitId', () => {
    it('deletes a benefit owned by the authenticated user', async () => {
      const created = await createBenefit();
      expect(created.status).toBe(201);

      const response = await request(app.getHttpServer())
        .delete(`/api/investments/5/benefits/${created.body.id}`)
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(response.status).toBe(200);
      await expect(
        request(app.getHttpServer())
          .get(`/api/investments/5/benefits/${created.body.id}`)
          .set('Authorization', `Bearer ${userOneToken}`),
      ).resolves.toMatchObject({ status: 404 });
    });
  });
});