import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from '../public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

function createExecutionContext(): ExecutionContext {
  return {
    getHandler: vi.fn(() => function handler() {}),
    getClass: vi.fn(() => class Controller {}),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  describe('canActivate', () => {
    it('allows a route marked public without invoking passport', () => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue(true),
      };
      const guard = new JwtAuthGuard(reflector as unknown as Reflector);
      const passportCanActivate = vi.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate',
      );

      expect(guard.canActivate(createExecutionContext())).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
      expect(passportCanActivate).not.toHaveBeenCalled();
    });

    it('delegates protected routes to the passport JWT guard', () => {
      const context = createExecutionContext();
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue(false),
      };
      const guard = new JwtAuthGuard(reflector as unknown as Reflector);
      const passportCanActivate = vi
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      expect(guard.canActivate(context)).toBe(true);
      expect(passportCanActivate).toHaveBeenCalledWith(context);
    });
  });
});