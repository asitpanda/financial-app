import { describe, expect, it, vi } from 'vitest';
import { executeActionContract, executeDrawerActionContract } from './actionContract';

describe('executeActionContract', () => {
  it('runs a successful contract and reports loading and success', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const notify = vi.fn().mockReturnValue('notification-id');

    const result = await executeActionContract(
      {
        intent: 'create-account',
        execute,
        feedback: { loading: 'Saving', success: 'Saved' },
      },
      { notify },
    );

    expect(result).toBe(true);
    expect(execute).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenNthCalledWith(1, {
      type: 'info',
      message: 'Saving',
      autoHideMs: 1200,
    });
    expect(notify).toHaveBeenNthCalledWith(2, { type: 'success', message: 'Saved' });
  });

  it('stops before execution when the precheck returns false', async () => {
    const precheck = vi.fn().mockResolvedValue(false);
    const execute = vi.fn().mockResolvedValue(undefined);
    const notify = vi.fn();

    const result = await executeActionContract(
      {
        intent: 'delete-account',
        precheck,
        execute,
        feedback: { error: 'Deletion is not allowed' },
      },
      { notify },
    );

    expect(result).toBe(false);
    expect(precheck).toHaveBeenCalledOnce();
    expect(execute).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith({ type: 'error', message: 'Deletion is not allowed' });
  });

  it('rolls back and reports a runtime error when execution fails', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('Server unavailable'));
    const rollback = vi.fn().mockResolvedValue(undefined);
    const notify = vi.fn();

    const result = await executeActionContract(
      {
        intent: 'update-goal',
        execute,
        rollback,
        feedback: { error: 'Update failed' },
      },
      { notify },
    );

    expect(result).toBe(false);
    expect(rollback).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith({ type: 'error', message: 'Server unavailable' });
  });

  it('uses contract error feedback when the runtime error has no message', async () => {
    const notify = vi.fn();

    const result = await executeActionContract(
      {
        intent: 'refresh-dashboard',
        execute: vi.fn().mockRejectedValue({}),
        feedback: { error: 'Refresh failed' },
      },
      { notify },
    );

    expect(result).toBe(false);
    expect(notify).toHaveBeenCalledWith({ type: 'error', message: 'Refresh failed' });
  });

  it('does not require a notification callback', async () => {
    await expect(
      executeActionContract({ intent: 'noop', execute: vi.fn().mockResolvedValue(undefined) }),
    ).resolves.toBe(true);
  });
});

describe('executeDrawerActionContract', () => {
  it('returns null for a successful action', async () => {
    await expect(
      executeDrawerActionContract({
        intent: 'save-drawer',
        execute: vi.fn().mockResolvedValue(undefined),
      }),
    ).resolves.toBeNull();
  });

  it('returns the runtime error message for a failed action', async () => {
    await expect(
      executeDrawerActionContract({
        intent: 'save-drawer',
        execute: vi.fn().mockRejectedValue(new Error('Unable to save changes')),
        feedback: { error: 'Save failed' },
      }),
    ).resolves.toBe('Unable to save changes');
  });

  it('returns the contract fallback for a failed action without a runtime message', async () => {
    await expect(
      executeDrawerActionContract({
        intent: 'save-drawer',
        execute: vi.fn().mockRejectedValue({}),
        feedback: { error: 'Save failed' },
      }),
    ).resolves.toBe('Save failed');
  });
});