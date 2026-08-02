import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe, ValidationError } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { resolveDbProvider } from './database/db-provider';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Array<{ field: string; message: string }> {
  const flattened: Array<{ field: string; message: string }> = [];

  for (const error of errors) {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        flattened.push({ field, message });
      }
    }

    if (error.children?.length) {
      flattened.push(...flattenValidationErrors(error.children, field));
    }
  }

  return flattened;
}

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;

  const hiddenKeys = new Set(['password', 'token', 'accessToken', 'refreshToken', 'authorization']);
  const source = body as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    sanitized[key] = hiddenKeys.has(key) ? '<hidden>' : value;
  }

  return sanitized;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isJsonLogFormat = String(process.env.LOG_FORMAT || '').toLowerCase() === 'json';

  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const dbProvider = resolveDbProvider(process.env.DB_PROVIDER);
    const origin = req.get('origin') ?? 'n/a';
    const payloadSummary = ['POST', 'PUT', 'PATCH'].includes(req.method)
      ? JSON.stringify(sanitizeBody(req.body ?? {}))
      : '';

    if (isJsonLogFormat) {
      console.log(
        JSON.stringify({
          tag: 'HTTP',
          phase: 'request',
          requestId,
          method: req.method,
          path: req.originalUrl,
          provider: dbProvider,
          origin,
          body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? sanitizeBody(req.body ?? {}) : undefined,
        }),
      );
    } else {
      console.log(
        `[HTTP] -> ${requestId} ${req.method} ${req.originalUrl} provider=${dbProvider} origin=${origin}${payloadSummary ? ` body=${payloadSummary}` : ''}`,
      );
    }

    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const userId = (req as any).user?.id ?? 'anonymous';
      if (isJsonLogFormat) {
        console.log(
          JSON.stringify({
            tag: 'HTTP',
            phase: 'response',
            requestId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs,
            userId,
          }),
        );
      } else {
        console.log(
          `[HTTP] <- ${requestId} ${req.method} ${req.originalUrl} status=${res.statusCode} duration=${durationMs}ms userId=${userId}`,
        );
      }
    });

    res.on('close', () => {
      if (!res.writableEnded) {
        const durationMs = Date.now() - startedAt;
        if (isJsonLogFormat) {
          console.log(
            JSON.stringify({
              tag: 'HTTP',
              phase: 'connection_closed',
              requestId,
              method: req.method,
              path: req.originalUrl,
              durationMs,
            }),
          );
        } else {
          console.log(
            `[HTTP] xx ${requestId} ${req.method} ${req.originalUrl} connection_closed duration=${durationMs}ms`,
          );
        }
      }
    });

    next();
  });

  const configuredOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = configuredOrigins;

  const isAllowedLocalhostOrigin = (origin: string) => {
    try {
      const { hostname } = new URL(origin);
      return hostname === 'localhost' || hostname === '127.0.0.1';
    } catch {
      return false;
    }
  };
  
  // Enable CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser clients and same-origin requests with no Origin header.
      if (!origin || allowedOrigins.includes(origin) || isAllowedLocalhostOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const flattened = flattenValidationErrors(errors);
        const first = flattened[0];

        return new BadRequestException({
          message: first?.message || 'Validation failed',
          field: first?.field,
          details: flattened,
        });
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('My Financial API')
    .setDescription('Personal Finance Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
