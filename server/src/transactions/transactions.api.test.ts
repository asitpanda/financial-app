import 'reflect-metadata';
import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from '../common/errors/global-exception.filter';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

const transactionsService = {
  create: vi.fn(),
  recordContribution: vi.fn(),
  recordWithdrawal: vi.fn(),
  findAll: vi.fn(),
  findByType: vi.fn(),
  findByDateRange: vi.fn(),
  findOne: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

describe('Transactions API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: TransactionsService, useValue: transactionsService }],
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
    vi.clearAllMocks();
    transactionsService.create.mockResolvedValue({ id: 19, type: 'EXPENSE', amount: 25 });
    transactionsService.recordContribution.mockResolvedValue({
      transaction: { id: 20 },
      investmentEvent: { id: 30 },
      message: 'Contribution recorded successfully',
    });
    transactionsService.recordWithdrawal.mockResolvedValue({
      transaction: { id: 21 },
      investmentEvent: { id: 31 },
      message: 'Withdrawal recorded successfully',
    });
    transactionsService.findAll.mockResolvedValue([{ id: 19, type: 'EXPENSE' }]);
    transactionsService.findByType.mockResolvedValue([{ id: 19, type: 'EXPENSE' }]);
    transactionsService.findByDateRange.mockResolvedValue([{ id: 19, type: 'EXPENSE' }]);
    transactionsService.findOne.mockResolvedValue({ id: 19, type: 'EXPENSE' });
    transactionsService.update.mockResolvedValue({ id: 19, notes: 'Updated' });
    transactionsService.remove.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('GET /api/transactions', () => {
    it('returns the authenticated user’s transactions when no type is selected', async () => {
      const response = await request(app.getHttpServer()).get('/api/transactions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 19, type: 'EXPENSE' }]);
      expect(transactionsService.findAll).toHaveBeenCalledWith(7);
      expect(transactionsService.findByType).not.toHaveBeenCalled();
    });

    it('filters by a valid transaction type', async () => {
      const response = await request(app.getHttpServer()).get('/api/transactions?type=EXPENSE');

      expect(response.status).toBe(200);
      expect(transactionsService.findByType).toHaveBeenCalledWith(7, 'EXPENSE');
      expect(transactionsService.findAll).not.toHaveBeenCalled();
    });

    it('rejects an unsupported transaction type', async () => {
      const response = await request(app.getHttpServer()).get('/api/transactions?type=UNKNOWN');

      expect(response.status).toBe(400);
      expect(transactionsService.findAll).not.toHaveBeenCalled();
      expect(transactionsService.findByType).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/transactions/date-range', () => {
    it('parses the requested date boundaries and scopes the query to the user', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/transactions/date-range?startDate=2026-10-01&endDate=2026-10-31',
      );

      expect(response.status).toBe(200);
      expect(transactionsService.findByDateRange).toHaveBeenCalledWith(
        7,
        new Date('2026-10-01'),
        new Date('2026-10-31'),
      );
    });

    it('rejects an invalid date boundary before calling the service', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/transactions/date-range?startDate=not-a-date&endDate=2026-10-31',
      );

      expect(response.status).toBe(400);
      expect(transactionsService.findByDateRange).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/transactions', () => {
    it('creates a transaction with transformed account IDs for the current user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          type: 'EXPENSE',
          amount: 25,
          sourceAccountId: '9',
          date: '2026-10-25',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: 19, type: 'EXPENSE', amount: 25 });
      expect(transactionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXPENSE', amount: 25, sourceAccountId: 9 }),
        7,
      );
    });

    it('rejects invalid DTO fields without invoking the service', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          type: 'UNKNOWN',
          amount: 25,
          date: '2026-10-25',
          userId: 99,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
      expect(transactionsService.create).not.toHaveBeenCalled();
    });

    it('maps a service balance error to the public bad-request response', async () => {
      transactionsService.create.mockRejectedValueOnce(
        new BadRequestException('Insufficient balance in source account.'),
      );

      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .send({ type: 'EXPENSE', amount: 25, sourceAccountId: 9, date: '2026-10-25' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Insufficient balance in source account.',
      });
    });
  });

  describe('POST /api/transactions/contributions/record', () => {
    it('transforms the amount and records a contribution for the current user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/transactions/contributions/record')
        .send({
          requestId: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7',
          investmentId: '7',
          amount: '75',
          transactionDate: '2026-10-25',
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        transaction: { id: 20 },
        investmentEvent: { id: 30 },
      });
      expect(transactionsService.recordContribution).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7',
          investmentId: '7',
          amount: 75,
        }),
        7,
      );
    });

    it('rejects a non-positive contribution amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/transactions/contributions/record')
        .send({ investmentId: '7', amount: '0', transactionDate: '2026-10-25' });

      expect(response.status).toBe(400);
      expect(transactionsService.recordContribution).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/transactions/withdrawals/record', () => {
    it('transforms the amount and records a withdrawal for the current user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/transactions/withdrawals/record')
        .send({ investmentId: '7', amount: '50', transactionDate: '2026-10-25' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        transaction: { id: 21 },
        investmentEvent: { id: 31 },
      });
      expect(transactionsService.recordWithdrawal).toHaveBeenCalledWith(
        expect.objectContaining({ investmentId: '7', amount: 50 }),
        7,
      );
    });

    it('rejects a non-positive withdrawal amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/transactions/withdrawals/record')
        .send({ investmentId: '7', amount: '0', transactionDate: '2026-10-25' });

      expect(response.status).toBe(400);
      expect(transactionsService.recordWithdrawal).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('parses the transaction ID and returns the matching record', async () => {
      const response = await request(app.getHttpServer()).get('/api/transactions/19');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 19, type: 'EXPENSE' });
      expect(transactionsService.findOne).toHaveBeenCalledWith(19, 7);
    });

    it('rejects a nonnumeric transaction ID', async () => {
      const response = await request(app.getHttpServer()).get('/api/transactions/not-a-number');

      expect(response.status).toBe(400);
      expect(transactionsService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/transactions/:id', () => {
    it('updates a transaction with the parsed ID and current user', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/transactions/19')
        .send({ notes: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 19, notes: 'Updated' });
      expect(transactionsService.update).toHaveBeenCalledWith(19, { notes: 'Updated' }, 7);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('deletes a transaction with the parsed ID and current user', async () => {
      const response = await request(app.getHttpServer()).delete('/api/transactions/19');

      expect(response.status).toBe(200);
      expect(transactionsService.remove).toHaveBeenCalledWith(19, 7);
    });
  });
});