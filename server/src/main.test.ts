import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';
import { bootstrap } from './main';

describe('bootstrap', () => {
  let app: {
    use: ReturnType<typeof vi.fn>;
    enableCors: ReturnType<typeof vi.fn>;
    useGlobalPipes: ReturnType<typeof vi.fn>;
    useGlobalFilters: ReturnType<typeof vi.fn>;
    listen: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.stubEnv('DB_PROVIDER', 'mock');
    vi.stubEnv('JWT_SECRET', 'test-secret');
    vi.stubEnv('LOG_FORMAT', 'json');
    vi.stubEnv('FRONTEND_URLS', 'https://app.example.test, https://admin.example.test');
    vi.stubEnv('PORT', '5100');

    app = {
      use: vi.fn(),
      enableCors: vi.fn(),
      useGlobalPipes: vi.fn(),
      useGlobalFilters: vi.fn(),
      listen: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(NestFactory, 'create').mockResolvedValue(app as never);
    vi.spyOn(SwaggerModule, 'createDocument').mockReturnValue({} as never);
    vi.spyOn(SwaggerModule, 'setup').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('rejects startup when the JWT secret is missing', async () => {
    vi.stubEnv('JWT_SECRET', '');

    await expect(bootstrap()).rejects.toThrow('JWT_SECRET is required.');
    expect(NestFactory.create).not.toHaveBeenCalled();
  });

  it('requires a database URL when a database-backed provider is selected', async () => {
    vi.stubEnv('DB_PROVIDER', 'postgres');
    vi.stubEnv('DATABASE_URL', undefined);

    await expect(bootstrap()).rejects.toThrow('DATABASE_URL is required.');
    expect(NestFactory.create).not.toHaveBeenCalled();
  });

  it('starts with a database URL when a database-backed provider is selected', async () => {
    vi.stubEnv('DB_PROVIDER', 'postgres');
    vi.stubEnv('DATABASE_URL', 'postgresql://db.example.test/finance');

    await bootstrap();

    expect(NestFactory.create).toHaveBeenCalledOnce();
    expect(app.listen).toHaveBeenCalledWith('5100');
  });

  it('registers global pipes and filters, Swagger documentation, and the configured port', async () => {
    await bootstrap();

    expect(NestFactory.create).toHaveBeenCalledOnce();
    expect(app.use).toHaveBeenCalledOnce();
    expect(app.useGlobalPipes).toHaveBeenCalledOnce();
    expect(app.useGlobalFilters).toHaveBeenCalledWith(expect.any(GlobalExceptionFilter));
    expect(SwaggerModule.createDocument).toHaveBeenCalledOnce();
    expect(SwaggerModule.setup).toHaveBeenCalledWith('api/docs', app, {});
    expect(app.listen).toHaveBeenCalledWith('5100');

    const validationPipe = app.useGlobalPipes.mock.calls[0][0] as ValidationPipe;
    const exceptionFactory = (validationPipe as unknown as {
      exceptionFactory: (errors: ValidationError[]) => BadRequestException;
    }).exceptionFactory;
    const exception = exceptionFactory([
      {
        property: 'profile',
        constraints: { isString: 'profile must be a string' },
        children: [
          {
            property: 'name',
            constraints: { isNotEmpty: 'name should not be empty' },
            children: [],
          },
        ],
      },
      { property: 'unconstrained', children: [] },
    ] as ValidationError[]);

    expect(exception.getResponse()).toEqual({
      message: 'profile must be a string',
      field: 'profile',
      details: [
        { field: 'profile', message: 'profile must be a string' },
        { field: 'profile.name', message: 'name should not be empty' },
      ],
    });
    expect(exceptionFactory([]).getResponse()).toEqual({
      message: 'Validation failed',
      field: undefined,
      details: [],
    });
  });

  it('sanitizes sensitive request fields and logs JSON request and response data', async () => {
    await bootstrap();
    const middleware = app.use.mock.calls[0][0];
    const next = vi.fn();
    const responseHandlers: Record<string, () => void> = {};
    const response = {
      setHeader: vi.fn(),
      on: vi.fn((event: string, handler: () => void) => {
        responseHandlers[event] = handler;
      }),
      statusCode: 401,
      writableEnded: false,
    };
    const request = {
      method: 'POST',
      originalUrl: '/auth/login',
      body: { email: 'user@example.test', password: 'secret', accessToken: 'token' },
      user: { id: 23 },
      get: vi.fn().mockReturnValue('https://app.example.test'),
    } as Record<string, unknown>;

    middleware(request, response, next);
    responseHandlers.finish();
    responseHandlers.close();

    const completedResponseHandlers: Record<string, () => void> = {};
    middleware({
      method: 'GET',
      originalUrl: '/health',
      get: vi.fn().mockReturnValue(undefined),
    }, {
      setHeader: vi.fn(),
      on: vi.fn((event: string, handler: () => void) => {
        completedResponseHandlers[event] = handler;
      }),
      statusCode: 200,
      writableEnded: true,
    }, next);
    completedResponseHandlers.close();
    completedResponseHandlers.finish();

    middleware({
      method: 'POST',
      originalUrl: '/transactions',
      body: null,
      get: vi.fn().mockReturnValue(undefined),
    }, {
      setHeader: vi.fn(),
      on: vi.fn(),
      statusCode: 201,
      writableEnded: true,
    }, next);

    expect(next).toHaveBeenCalledTimes(3);
    expect(request.requestId).toEqual(expect.any(String));
    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', request.requestId);
    const jsonLogs = vi.mocked(console.log).mock.calls
      .map(([value]) => value)
      .filter((value): value is string => typeof value === 'string' && value.startsWith('{'))
      .map((value) => JSON.parse(value));
    expect(jsonLogs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        phase: 'request',
        method: 'POST',
        path: '/auth/login',
        provider: 'mock',
        origin: 'https://app.example.test',
        body: { email: 'user@example.test', password: '<hidden>', accessToken: '<hidden>' },
      }),
      expect.objectContaining({ phase: 'response', status: 401, userId: 23 }),
      expect.objectContaining({ phase: 'connection_closed', path: '/auth/login' }),
    ]));
    expect(jsonLogs.some((log) => log.phase === 'request' && log.path === '/health' && log.body === undefined)).toBe(true);
    expect(jsonLogs).toContainEqual(expect.objectContaining({
      phase: 'request',
      path: '/transactions',
      body: {},
    }));
  });

  it('allows configured and local CORS origins while rejecting other origins', async () => {
    await bootstrap();
    const corsOptions = app.enableCors.mock.calls[0][0];
    const origin = corsOptions.origin as (
      value: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) => void;
    const checkOrigin = (value: string | undefined) => {
      const callback = vi.fn();
      origin(value, callback);
      return callback.mock.calls[0];
    };

    expect(checkOrigin(undefined)).toEqual([null, true]);
    expect(checkOrigin('https://admin.example.test')).toEqual([null, true]);
    expect(checkOrigin('http://localhost:3000')).toEqual([null, true]);
    expect(checkOrigin('http://127.0.0.1:3000')).toEqual([null, true]);
    expect(checkOrigin('not a URL')).toEqual([new Error('Not allowed by CORS: not a URL'), false]);
    expect(checkOrigin('https://untrusted.example.test')).toEqual([
      new Error('Not allowed by CORS: https://untrusted.example.test'),
      false,
    ]);
    expect(corsOptions.credentials).toBe(true);

    vi.stubEnv('FRONTEND_URLS', '');
    vi.stubEnv('FRONTEND_URL', '');
    await bootstrap();
    const emptyConfigurationOrigin = app.enableCors.mock.calls[1][0].origin as typeof origin;
    const rejectedOrigin = vi.fn();
    emptyConfigurationOrigin('https://app.example.test', rejectedOrigin);
    expect(rejectedOrigin).toHaveBeenCalledWith(
      new Error('Not allowed by CORS: https://app.example.test'),
      false,
    );
  });

  it('logs text requests and reports a prematurely closed response', async () => {
    vi.stubEnv('LOG_FORMAT', 'text');
    vi.stubEnv('PORT', '');
    await bootstrap();
    const middleware = app.use.mock.calls[0][0];
    const responseHandlers: Record<string, () => void> = {};
    const response = {
      setHeader: vi.fn(),
      on: vi.fn((event: string, handler: () => void) => {
        responseHandlers[event] = handler;
      }),
      statusCode: 200,
      writableEnded: false,
    };

    middleware({
      method: 'GET',
      originalUrl: '/health',
      user: undefined,
      get: vi.fn().mockReturnValue(undefined),
    }, response, vi.fn());
    responseHandlers.finish();
    responseHandlers.close();

    expect(app.listen).toHaveBeenCalledWith(5000);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('GET /health'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('status=200'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('userId=anonymous'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('connection_closed'));
  });

  it('uses fallback environment values and preserves primitive or empty request bodies in text logs', async () => {
    vi.stubEnv('LOG_FORMAT', '');
    vi.stubEnv('FRONTEND_URLS', '');
    vi.stubEnv('FRONTEND_URL', 'https://legacy.example.test');
    await bootstrap();

    const corsOrigin = app.enableCors.mock.calls[0][0].origin as (
      value: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) => void;
    const corsCallback = vi.fn();
    corsOrigin('https://legacy.example.test', corsCallback);
    expect(corsCallback).toHaveBeenCalledWith(null, true);

    const middleware = app.use.mock.calls[0][0];
    const createResponse = (writableEnded: boolean) => {
      const handlers: Record<string, () => void> = {};
      return {
        response: {
          setHeader: vi.fn(),
          on: vi.fn((event: string, handler: () => void) => {
            handlers[event] = handler;
          }),
          statusCode: 201,
          writableEnded,
        },
        handlers,
      };
    };
    const primitiveResponse = createResponse(true);

    middleware({
      method: 'POST',
      originalUrl: '/transactions',
      body: 'raw payload',
      get: vi.fn().mockReturnValue(undefined),
    }, primitiveResponse.response, vi.fn());
    primitiveResponse.handlers.finish();
    primitiveResponse.handlers.close();

    const emptyResponse = createResponse(true);
    middleware({
      method: 'PATCH',
      originalUrl: '/transactions/1',
      body: null,
      get: vi.fn().mockReturnValue(undefined),
    }, emptyResponse.response, vi.fn());
    emptyResponse.handlers.close();

    const falsyResponse = createResponse(true);
    middleware({
      method: 'POST',
      originalUrl: '/transactions',
      body: '',
      get: vi.fn().mockReturnValue(undefined),
    }, falsyResponse.response, vi.fn());
    falsyResponse.handlers.close();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('body="raw payload"'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('body={}'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('body=""'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('status=201'));
  });

  it('colors failed text responses when running in a VS Code terminal', async () => {
    vi.stubEnv('LOG_FORMAT', 'text');
    vi.stubEnv('TERM_PROGRAM', 'vscode');
    vi.stubEnv('NO_COLOR', undefined);
    const stdout = process.stdout as NodeJS.WriteStream & { isTTY: boolean };
    const ttyDescriptor = Object.getOwnPropertyDescriptor(stdout, 'isTTY');
    Object.defineProperty(stdout, 'isTTY', { configurable: true, value: true });

    try {
      await bootstrap();
    } finally {
      if (ttyDescriptor) {
        Object.defineProperty(stdout, 'isTTY', ttyDescriptor);
      } else {
        Reflect.deleteProperty(stdout, 'isTTY');
      }
    }

    const middleware = app.use.mock.calls[0][0];
    const handlers: Record<string, () => void> = {};
    const response = {
      setHeader: vi.fn(),
      on: vi.fn((event: string, handler: () => void) => {
        handlers[event] = handler;
      }),
      statusCode: 500,
      writableEnded: false,
    };

    middleware({
      method: 'PUT',
      originalUrl: '/transactions/1',
      body: { token: 'secret' },
      user: { id: 8 },
      get: vi.fn().mockReturnValue('https://app.example.test'),
    }, response, vi.fn());
    handlers.finish();
    handlers.close();

    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/\x1b\[31m.*status=500.*\x1b\[0m/));
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/\x1b\[31m.*connection_closed.*\x1b\[0m/));
  });
});