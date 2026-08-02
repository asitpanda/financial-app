import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ApiErrorCode, ApiErrorResponse } from './api-error.types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId = String((req as any).requestId || 'unknown');
    const base: Omit<ApiErrorResponse, 'statusCode' | 'code' | 'message'> = {
      requestId,
      timestamp: new Date().toISOString(),
      path: req.originalUrl || req.url,
      method: req.method,
    };

    // Prisma errors first so we can provide focused error contracts.
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaResult = this.mapPrismaError(exception);
      const payload: ApiErrorResponse = {
        ...base,
        ...prismaResult,
      };
      res.status(prismaResult.statusCode).json(payload);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const normalized = this.normalizeHttpExceptionBody(status, body);
      const payload: ApiErrorResponse = {
        ...base,
        ...normalized,
      };
      res.status(status).json(payload);
      return;
    }

    const payload: ApiErrorResponse = {
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(payload);
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  } {
    if (exception.code === 'P2002') {
      return {
        statusCode: HttpStatus.CONFLICT,
        code: 'CONFLICT',
        message: 'Unique constraint violation',
        details: exception.meta,
      };
    }

    if (exception.code === 'P2003') {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'INVALID_REFERENCE',
        message: 'Foreign key constraint violation',
        details: exception.meta,
      };
    }

    if (exception.code === 'P2025') {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        message: 'Requested record was not found',
        details: exception.meta,
      };
    }

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'BAD_REQUEST',
      message: exception.message,
      details: exception.meta,
    };
  }

  private normalizeHttpExceptionBody(status: number, body: unknown): {
    statusCode: number;
    code: ApiErrorCode;
    message: string;
    field?: string;
    details?: unknown;
  } {
    if (typeof body === 'string') {
      return {
        statusCode: status,
        code: this.codeFromStatus(status),
        message: body,
      };
    }

    if (!body || typeof body !== 'object') {
      return {
        statusCode: status,
        code: this.codeFromStatus(status),
        message: 'Request failed',
      };
    }

    const payload = body as Record<string, unknown>;

    const rawMessage = payload.message;
    const rawField = payload.field;

    if (Array.isArray(rawMessage)) {
      return {
        statusCode: status,
        code: 'VALIDATION_ERROR',
        message: rawMessage[0] || 'Validation failed',
        details: rawMessage,
      };
    }

    return {
      statusCode: status,
      code: this.codeFromStatus(status),
      message: String(rawMessage || payload.error || 'Request failed'),
      field: rawField ? String(rawField) : undefined,
      details: payload,
    };
  }

  private codeFromStatus(status: number): ApiErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
    }
  }
}
