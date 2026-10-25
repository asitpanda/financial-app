import { describe, expect, it } from 'vitest';
import { emptyField, FIELD_TYPE_OPTIONS, formatDate, getErrorMessage } from './locker.utils';

describe('FIELD_TYPE_OPTIONS', () => {
  it('defines the supported field types', () => {
    expect(FIELD_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      'text',
      'password',
      'number',
      'select',
      'date',
    ]);
  });

});

describe('emptyField', () => {
  it('creates a blank text field', () => {
    expect(emptyField()).toEqual({ label: '', type: 'text', masked: false });
  });
});

describe('formatDate', () => {
  it('formats dates and leaves missing dates blank', () => {
    expect(formatDate('2026-01-15T00:00:00.000Z')).toBeTruthy();
    expect(formatDate()).toBe('');
    expect(formatDate('')).toBe('');
  });
});

describe('getErrorMessage', () => {
  it('extracts API messages including validation message arrays', () => {
    expect(getErrorMessage({ response: { data: { message: 'Rejected' } } }, 'Fallback')).toBe('Rejected');
    expect(getErrorMessage({ response: { data: { message: ['Name is required', 'Value is invalid'] } } }, 'Fallback')).toBe(
      'Name is required, Value is invalid',
    );
    expect(getErrorMessage(new Error('Ignored'), 'Fallback')).toBe('Fallback');
  });
});
