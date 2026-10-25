import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public', () => {
  it('marks the decorated route as public', () => {
    class TestController {
      handler() {}
    }

    Public()(TestController.prototype.handler);

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TestController.prototype.handler)).toBe(
      true,
    );
  });
});