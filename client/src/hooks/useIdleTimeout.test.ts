import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useIdleTimeout from './useIdleTimeout';

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const setup = (enabled = true, onTimeout = vi.fn()) => renderHook(
    ({ active }) => useIdleTimeout({ enabled: active, idleMs: 30000, warningMs: 10000, onTimeout }),
    { initialProps: { active: enabled } },
  );

  it('warns only during the final grace period and expires once at the total deadline', () => {
    const onTimeout = vi.fn();
    const { result } = setup(true, onTimeout);
    act(() => vi.advanceTimersByTime(19000));
    expect(result.current.isWarning).toBe(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toMatchObject({ isWarning: true, secondsLeft: 10 });
    act(() => vi.advanceTimersByTime(9000));
    expect(result.current.secondsLeft).toBe(1);
    expect(onTimeout).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(6000));
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it.each(['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'])(
    'resets idle time on %s before the warning', (event) => {
      const { result } = setup();
      act(() => vi.advanceTimersByTime(10000));
      fireEvent(window, new Event(event));
      act(() => vi.advanceTimersByTime(19000));
      expect(result.current.isWarning).toBe(false);
      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.isWarning).toBe(true);
    },
  );

  it('recognizes continuous movement rather than waiting for movement to stop', () => {
    const { result } = setup();
    for (let second = 0; second < 40; second += 1) {
      act(() => vi.advanceTimersByTime(1000));
      fireEvent.pointerMove(window);
    }
    expect(result.current.isWarning).toBe(false);
  });

  it('requires explicit continuation during the warning and starts a fresh idle period', () => {
    const onTimeout = vi.fn();
    const { result } = setup(true, onTimeout);
    act(() => vi.advanceTimersByTime(20000));
    fireEvent.pointerMove(window);
    fireEvent.keyDown(window, { key: 'a' });
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toMatchObject({ isWarning: true, secondsLeft: 5 });
    act(() => result.current.stayActive());
    expect(result.current.isWarning).toBe(false);
    act(() => vi.advanceTimersByTime(19000));
    expect(result.current.isWarning).toBe(false);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it.each(['visibilitychange', 'pointerdown', 'continue'])(
    'rejects an expired session immediately after sleep on %s', (event) => {
      const onTimeout = vi.fn();
      const { result } = setup(true, onTimeout);
      act(() => {
        vi.setSystemTime(Date.now() + 31000);
        if (event === 'continue') result.current.stayActive();
        else fireEvent(event === 'visibilitychange' ? document : window, new Event(event));
      });
      act(() => result.current.stayActive());
      expect(onTimeout).toHaveBeenCalledTimes(1);
    },
  );

  it('starts a fresh idle period when remounted after a page refresh', () => {
    const first = setup();
    act(() => vi.advanceTimersByTime(15000));
    first.unmount();
    const { result } = setup();
    act(() => vi.advanceTimersByTime(19000));
    expect(result.current.isWarning).toBe(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toMatchObject({ isWarning: true, secondsLeft: 10 });
  });

  it('does not track unauthenticated sessions and stops tracking when disabled or unmounted', () => {
    const onTimeout = vi.fn();
    const { result, rerender, unmount } = setup(false, onTimeout);
    act(() => vi.advanceTimersByTime(60000));
    expect(result.current.isWarning).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(onTimeout).not.toHaveBeenCalled();
    rerender({ active: true });
    act(() => vi.advanceTimersByTime(20000));
    expect(result.current.isWarning).toBe(true);
    rerender({ active: false });
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(60000));
    fireEvent.pointerDown(window);
    expect(result.current.isWarning).toBe(false);
    expect(onTimeout).not.toHaveBeenCalled();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});