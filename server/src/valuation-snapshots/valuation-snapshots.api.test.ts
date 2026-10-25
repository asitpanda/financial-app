import 'reflect-metadata';
import { ExecutionContext, INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from '../common/errors/global-exception.filter';
import { ValuationSnapshotsController } from './valuation-snapshots.controller';
import { ValuationSnapshotsService } from './valuation-snapshots.service';

const valuationSnapshotsService = {
  create: vi.fn(),
  findAll: vi.fn(),
  findAllByInvestment: vi.fn(),
  findOne: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

describe('Valuation snapshots API', () => {
  let app: INestApplication;
  let authenticatedUserId: number | undefined = 7;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ValuationSnapshotsController],
      providers: [{ provide: ValuationSnapshotsService, useValue: valuationSnapshotsService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalGuards({
      canActivate: (context: ExecutionContext) => {
        if (authenticatedUserId !== undefined) {
          context.switchToHttp().getRequest().user = { id: authenticatedUserId };
        }
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
    vi.clearAllMocks();
    authenticatedUserId = 7;
    valuationSnapshotsService.create.mockResolvedValue({ id: 27, investmentId: 19, marketValue: 150 });
    valuationSnapshotsService.findAll.mockResolvedValue([{ id: 27, investmentId: 19, marketValue: 150 }]);
    valuationSnapshotsService.findAllByInvestment.mockResolvedValue([
      { id: 27, investmentId: 19, marketValue: 150 },
    ]);
    valuationSnapshotsService.findOne.mockResolvedValue({ id: 27, investmentId: 19, marketValue: 150 });
    valuationSnapshotsService.update.mockResolvedValue({ id: 27, investmentId: 19, marketValue: 200 });
    valuationSnapshotsService.remove.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('GET /api/valuation-snapshots', () => {
    it('returns snapshots for the authenticated user', async () => {
      const response = await request(app.getHttpServer()).get('/api/valuation-snapshots');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 27, investmentId: 19, marketValue: 150 }]);
      expect(valuationSnapshotsService.findAll).toHaveBeenCalledWith(7);
    });

    it('rejects requests without authenticated user context', async () => {
      authenticatedUserId = undefined;

      const response = await request(app.getHttpServer()).get('/api/valuation-snapshots');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
      expect(valuationSnapshotsService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/investments/:investmentId/valuation-snapshots', () => {
    it('creates a snapshot for the route investment and authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investments/19/valuation-snapshots')
        .send({
          investmentId: '999',
          snapshotDate: '2026-01-01',
          marketValue: 150,
          units: 1.5,
          price: 100,
          source: 'manual',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: 27, investmentId: 19, marketValue: 150 });
      expect(valuationSnapshotsService.create).toHaveBeenCalledWith({
        investmentId: '19',
        snapshotDate: '2026-01-01',
        marketValue: 150,
        units: 1.5,
        price: 100,
        source: 'manual',
      }, 7);
    });

    it('rejects a future valuation date before calling the service', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investments/19/valuation-snapshots')
        .send({ investmentId: '19', snapshotDate: '2999-01-01', marketValue: 150 });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
      expect(valuationSnapshotsService.create).not.toHaveBeenCalled();
    });

    it('rejects a nonnumeric investment path parameter before calling the service', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/investments/not-a-number/valuation-snapshots')
        .send({ investmentId: '19', snapshotDate: '2026-01-01', marketValue: 150 });

      expect(response.status).toBe(400);
      expect(valuationSnapshotsService.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/investments/:investmentId/valuation-snapshots', () => {
    it('parses the investment ID and scopes the listing to the authenticated user', async () => {
      const response = await request(app.getHttpServer()).get('/api/investments/19/valuation-snapshots');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 27, investmentId: 19, marketValue: 150 }]);
      expect(valuationSnapshotsService.findAllByInvestment).toHaveBeenCalledWith('19', 7);
    });
  });

  describe('GET /api/investments/:investmentId/valuation-snapshots/:snapshotId', () => {
    it('returns the requested snapshot for the authenticated user', async () => {
      const response = await request(app.getHttpServer()).get('/api/investments/19/valuation-snapshots/27');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 27, investmentId: 19, marketValue: 150 });
      expect(valuationSnapshotsService.findOne).toHaveBeenCalledWith('27', 7);
    });

    it('maps a missing snapshot to the public not-found response', async () => {
      valuationSnapshotsService.findOne.mockRejectedValueOnce(new NotFoundException('Snapshot not found'));

      const response = await request(app.getHttpServer()).get('/api/investments/19/valuation-snapshots/27');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Snapshot not found',
      });
    });
  });

  describe('PATCH /api/investments/:investmentId/valuation-snapshots/:snapshotId', () => {
    it('updates the snapshot using the route investment ID and authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/investments/19/valuation-snapshots/27')
        .send({ investmentId: '999', marketValue: 200 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 27, investmentId: 19, marketValue: 200 });
      expect(valuationSnapshotsService.update).toHaveBeenCalledWith(
        '27',
        { investmentId: '19', marketValue: 200 },
        7,
      );
    });
  });

  describe('DELETE /api/investments/:investmentId/valuation-snapshots/:snapshotId', () => {
    it('deletes the requested snapshot for the authenticated user', async () => {
      const response = await request(app.getHttpServer()).delete('/api/investments/19/valuation-snapshots/27');

      expect(response.status).toBe(200);
      expect(valuationSnapshotsService.remove).toHaveBeenCalledWith('27', 7);
    });
  });
});