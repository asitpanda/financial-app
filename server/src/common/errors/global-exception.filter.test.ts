import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from './global-exception.filter';

const createHttpHost = (request: Record<string, unknown> = {}) => {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', originalUrl: '/api/resource', ...request }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
};

describe('GlobalExceptionFilter', () => {
  it('maps known Prisma constraint errors to focused API error contracts', () => {
    const cases = [
      { code: 'P2002', status: HttpStatus.CONFLICT, apiCode: 'CONFLICT', message: 'Unique constraint violation' },
      { code: 'P2003', status: HttpStatus.BAD_REQUEST, apiCode: 'INVALID_REFERENCE', message: 'Foreign key constraint violation' },
      { code: 'P2025', status: HttpStatus.NOT_FOUND, apiCode: 'NOT_FOUND', message: 'Requested record was not found' },
    ] as const;

    for (const scenario of cases) {
      const { host, response } = createHttpHost({ requestId: 'request-123' });
      const exception = new Prisma.PrismaClientKnownRequestError(scenario.message, {
        code: scenario.code,
        clientVersion: 'test',
        meta: { target: ['id'] },
      });

      new GlobalExceptionFilter().catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(scenario.status);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'request-123',
          path: '/api/resource',
          method: 'GET',
          statusCode: scenario.status,
          code: scenario.apiCode,
          message: scenario.message,
          details: { target: ['id'] },
          timestamp: expect.any(String),
        }),
      );
    }
  });

  it('maps other known Prisma errors to bad requests', () => {
    const { host, response } = createHttpHost();
    const exception = new Prisma.PrismaClientKnownRequestError('Database request failed', {
      code: 'P2000',
      clientVersion: 'test',
      meta: { column: 'name' },
    });

    new GlobalExceptionFilter().catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BAD_REQUEST',
        message: 'Database request failed',
        details: { column: 'name' },
      }),
    );
  });

  it('maps Prisma validation errors to a bad-request validation response', () => {
    const { host, response } = createHttpHost();
    const exception = new Prisma.PrismaClientValidationError('Invalid Prisma input', {
      clientVersion: 'test',
    });

    new GlobalExceptionFilter().catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'Request contains invalid data for one or more fields.',
        details: { error: 'Invalid Prisma input' },
      }),
    );
  });

  it('normalizes a field-specific HTTP exception', () => {
    const { host, response } = createHttpHost({ url: '/fallback', requestId: undefined });

    new GlobalExceptionFilter().catch(
      new BadRequestException({ field: 'amount', message: 'Amount is invalid' }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'unknown',
        path: '/api/resource',
        code: 'BAD_REQUEST',
        field: 'amount',
        message: 'Amount is invalid',
      }),
    );
  });

  it('normalizes validation messages and string HTTP responses', () => {
    const validation = createHttpHost();
    new GlobalExceptionFilter().catch(
      new BadRequestException({ message: ['amount must be positive', 'amount must be a number'] }),
      validation.host,
    );
    expect(validation.response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'amount must be positive',
        details: ['amount must be positive', 'amount must be a number'],
      }),
    );

    const notFound = createHttpHost({ originalUrl: undefined, url: '/fallback' });
    new GlobalExceptionFilter().catch(new NotFoundException('Missing resource'), notFound.host);
    expect(notFound.response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(notFound.response.json).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/fallback', code: 'NOT_FOUND', message: 'Missing resource' }),
    );
  });

  it('maps raw authorization responses to the matching API error code', () => {
    const { host, response } = createHttpHost();

    new GlobalExceptionFilter().catch(
      new HttpException('Access denied', HttpStatus.UNAUTHORIZED),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'UNAUTHORIZED',
        message: 'Access denied',
      }),
    );
  });

  it('returns a generic internal error for unexpected exceptions', () => {
    const { host, response } = createHttpHost();

    new GlobalExceptionFilter().catch(new Error('Sensitive internal details'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      }),
    );
    expect(response.json).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Sensitive internal details' }),
    );
  });
});