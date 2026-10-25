import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from '../common/errors/global-exception.filter';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';

const emptyPage = {
  data: [],
  pagination: {
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
  },
};

const investmentsService = {
  create: vi.fn(),
  findPage: vi.fn(),
  getDashboardAnalytics: vi.fn(),
  getMetadata: vi.fn(),
  getPerformance: vi.fn(),
  findOne: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

describe('Investments API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [InvestmentsController],
      providers: [{ provide: InvestmentsService, useValue: investmentsService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalGuards({
      canActivate: (context) => {
        context.switchToHttp().getRequest().user = { id: 7 };
        return true;
      },
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  beforeEach(() => {
    investmentsService.findPage.mockResolvedValue(emptyPage);
    investmentsService.create.mockResolvedValue({ id: 19, name: 'Index fund' });
    investmentsService.getDashboardAnalytics.mockResolvedValue({ totalValue: 1250 });
    investmentsService.getMetadata.mockResolvedValue({ assetTypes: [] });
    investmentsService.getPerformance.mockResolvedValue({ points: [] });
    investmentsService.findOne.mockResolvedValue({ id: 19, name: 'Index fund' });
    investmentsService.update.mockResolvedValue({ id: 19, name: 'Updated fund' });
    investmentsService.remove.mockResolvedValue({ deleted: true });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/investments', () => {
    it('uses the shared pagination defaults when query values are omitted', async () => {
      const response = await request(app.getHttpServer()).get('/api/investments');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(emptyPage);
      expect(investmentsService.findPage).toHaveBeenCalledWith(7, { page: 1, limit: 25 });
    });

    it('transforms pagination query strings into numbers', async () => {
      const response = await request(app.getHttpServer()).get('/api/investments?page=2&limit=10');

      expect(response.status).toBe(200);
      expect(investmentsService.findPage).toHaveBeenCalledWith(7, { page: 2, limit: 10 });
    });

    it('rejects pagination values outside the shared DTO contract', async () => {
      const response = await request(app.getHttpServer()).get('/api/investments?page=0&limit=101');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(investmentsService.findPage).not.toHaveBeenCalled();
    });

    it('transforms investment filters and comma-separated IDs from query strings', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/investments?ids=3,4&status=active&assetType=EQUITY&accountingTreatment=INVESTMENT&sortBy=assetType&sortDirection=asc',
      );

      expect(response.status).toBe(200);
      expect(investmentsService.findPage).toHaveBeenCalledWith(7, {
        page: 1,
        limit: 25,
        ids: [3, 4],
        status: 'active',
        assetType: 'EQUITY',
        accountingTreatment: 'INVESTMENT',
        sortBy: 'assetType',
        sortDirection: 'asc',
      });
    });
  });

  describe('POST /api/investments', () => {
    it('transforms classification and numeric fields before creating for the current user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investments')
        .send({
          name: 'Index fund',
          assetType: ' equity ',
          assetCategory: ' stock ',
          accountId: '9',
          institutionName: 'Broker',
          status: 'active',
          currency: 'USD',
          startDate: '2026-01-01',
          totalInvested: '0',
          contributionMode: ' one_time ',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: 19, name: 'Index fund' });
      expect(investmentsService.create).toHaveBeenCalledWith( {
        name: 'Index fund',
        assetType: 'EQUITY',
        assetCategory: 'STOCK',
        accountId: 9,
        institutionName: 'Broker',
        status: 'active',
        currency: 'USD',
        startDate: '2026-01-01',
        totalInvested: 0,
        contributionMode: 'ONE_TIME',
      }, 7);
    });

    it.each([
      ['negative amounts', { totalInvested: '-1' }],
      ['client-supplied ownership fields', { userId: 99 }],
    ])('rejects %s without calling the service', async (_caseName, overrides) => {
      const response = await request(app.getHttpServer())
        .post('/api/investments')
        .send({
          name: 'Index fund',
          assetType: 'EQUITY',
          assetCategory: 'STOCK',
          accountId: 9,
          institutionName: 'Broker',
          status: 'active',
          currency: 'USD',
          startDate: '2026-01-01',
          totalInvested: 100,
          contributionMode: 'ONE_TIME',
          ...overrides,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
      expect(investmentsService.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/investments/dashboard', () => {
    it('returns dashboard analytics for the current user', async () => {
      const response = await request(app.getHttpServer()).get('/api/investments/dashboard');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ totalValue: 1250 });
      expect(investmentsService.getDashboardAnalytics).toHaveBeenCalledWith(7);
    });
  });

  describe('GET /api/investments/metadata', () => {
    it('returns investment metadata', async () => {
      const response = await request(app.getHttpServer()).get('/api/investments/metadata');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ assetTypes: [] });
      expect(investmentsService.getMetadata).toHaveBeenCalledOnce();
    });
  });

  describe('GET /api/investments/:id/performance', () => {
    it('parses the investment ID and returns its performance for the current user', async () => {
      const response = await request(app.getHttpServer()).get('/api/investments/19/performance');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ points: [] });
      expect(investmentsService.getPerformance).toHaveBeenCalledWith(19, 7);
    });
  });

  describe('GET /api/investments/:id', () => {
    it('returns the investment for the current user', async () => {
      const response = await request(app.getHttpServer()).get('/api/investments/19');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 19, name: 'Index fund' });
      expect(investmentsService.findOne).toHaveBeenCalledWith(19, 7);
    });

    it('rejects a nonnumeric investment ID before calling the service', async () => {
      const response = await request(app.getHttpServer()).get('/api/investments/not-a-number');

      expect(response.status).toBe(400);
      expect(investmentsService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/investments/:id', () => {
    it('updates the parsed investment ID for the current user', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/investments/19')
        .send({ name: 'Updated fund' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 19, name: 'Updated fund' });
      expect(investmentsService.update).toHaveBeenCalledWith(19, { name: 'Updated fund' }, 7);
    });
  });

  describe('DELETE /api/investments/:id', () => {
    it('deletes the parsed investment ID for the current user', async () => {
      const response = await request(app.getHttpServer()).delete('/api/investments/19');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ deleted: true });
      expect(investmentsService.remove).toHaveBeenCalledWith(19, 7);
    });
  });
});