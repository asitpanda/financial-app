import { describe, expect, it } from 'vitest';
import { parseApiErrorMessages } from './apiError';

describe('parseApiErrorMessages', () => {
  it('returns a non-empty API message string', () => {
    expect(
      parseApiErrorMessages(
        { response: { data: { message: 'Account already exists' } } },
        'Request failed',
      ),
    ).toEqual(['Account already exists']);
  });

  it('returns non-empty string messages from an API message array', () => {
    expect(
      parseApiErrorMessages(
        { response: { data: { message: ['Name is required', '', 42, 'Amount is invalid'] } } },
        'Request failed',
      ),
    ).toEqual(['Name is required', 'Amount is invalid']);
  });

  it('uses the error message when the API response has no usable message', () => {
    expect(parseApiErrorMessages(new Error('Network unavailable'), 'Request failed')).toEqual([
      'Network unavailable',
    ]);
  });

  it('uses the fallback for missing, blank, and malformed error data', () => {
    expect(parseApiErrorMessages(undefined, 'Request failed')).toEqual(['Request failed']);
    expect(parseApiErrorMessages({ response: { data: { message: '  ' } } }, 'Request failed')).toEqual([
      'Request failed',
    ]);
    expect(parseApiErrorMessages({ response: { data: { message: [] } } }, 'Request failed')).toEqual([
      'Request failed',
    ]);
  });
});