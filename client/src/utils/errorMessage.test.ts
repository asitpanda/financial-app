import { describe, expect, it } from 'vitest';
import { getRuntimeErrorMessage } from './errorMessage';

describe('getRuntimeErrorMessage', () => {
  it('prefers the nested API message', () => {
    expect(
      getRuntimeErrorMessage(
        { response: { data: { message: 'Invalid transaction amount' } }, message: 'Bad request' },
        'Request failed',
      ),
    ).toBe('Invalid transaction amount');
  });

  it('uses the top-level message when no nested message exists', () => {
    expect(getRuntimeErrorMessage(new Error('Network unavailable'), 'Request failed')).toBe(
      'Network unavailable',
    );
  });

  it('uses the first item from a non-empty message array', () => {
    expect(
      getRuntimeErrorMessage({ response: { data: { message: ['Validation failed', 'Other error'] } } }, 'Request failed'),
    ).toBe('Validation failed');
  });

  it('uses the fallback for blank, empty, and unknown errors', () => {
    expect(getRuntimeErrorMessage({ message: '  ' }, 'Request failed')).toBe('Request failed');
    expect(getRuntimeErrorMessage({ response: { data: { message: [] } } }, 'Request failed')).toBe(
      'Request failed',
    );
    expect(getRuntimeErrorMessage('unexpected error', 'Request failed')).toBe('Request failed');
    expect(getRuntimeErrorMessage(null, 'Request failed')).toBe('Request failed');
  });
});