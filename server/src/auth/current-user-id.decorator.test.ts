import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { CurrentUserId } from './current-user-id.decorator';

type ParameterMetadata = {
  data: unknown;
  factory: (data: unknown, context: ExecutionContext) => number;
};

function resolveCurrentUserId(id: number | string | null | undefined): number {
  class TestController {
    handler(_userId: number) {}
  }

  CurrentUserId()(TestController.prototype, 'handler', 0);
  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'handler',
  ) as Record<string, ParameterMetadata>;
  const [{ data, factory }] = Object.values(metadata);
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ user: { id } }) }),
  } as unknown as ExecutionContext;

  return factory(data, context);
}

describe('CurrentUserId', () => {
  it('converts an authenticated string ID to a positive integer', () => {
    expect(resolveCurrentUserId('42')).toBe(42);
  });

  it.each([undefined, null, 'not-a-number', '0', '-2', '1.5'])(
    'rejects an invalid authenticated user ID',
    (id) => {
      expect(() => resolveCurrentUserId(id)).toThrow(
        new UnauthorizedException('Authenticated user context is missing.'),
      );
    },
  );
});