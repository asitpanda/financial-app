import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authEvents } from './authEvents';

describe('authEvents', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('notifies every registered listener', () => {
    const firstListener = vi.fn();
    const secondListener = vi.fn();
    const removeFirst = authEvents.onUnauthorized(firstListener);
    authEvents.onUnauthorized(secondListener);

    authEvents.emitUnauthorized();

    expect(firstListener).toHaveBeenCalledOnce();
    expect(secondListener).toHaveBeenCalledOnce();
    removeFirst();
  });

  it('stops notifying a listener after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = authEvents.onUnauthorized(listener);

    unsubscribe();
    authEvents.emitUnauthorized();

    expect(listener).not.toHaveBeenCalled();
  });

  it('allows the same listener to be unsubscribed more than once', () => {
    const listener = vi.fn();
    const unsubscribe = authEvents.onUnauthorized(listener);

    unsubscribe();
    unsubscribe();
    authEvents.emitUnauthorized();

    expect(listener).not.toHaveBeenCalled();
  });
});