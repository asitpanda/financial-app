import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateUserPreferencesDto } from './update-user-preferences.dto';

describe('UpdateUserPreferencesDto', () => {
  it('accepts an empty patch and every supported preference value', () => {
    const patches = [
      {},
      { currencyDisplay: 'symbol', themeMode: 'light', dateFormat: 'DD_MM_YYYY' },
      { currencyDisplay: 'code', themeMode: 'dark', dateFormat: 'MM_DD_YYYY' },
      { dateFormat: 'YYYY_MM_DD' },
      { dateFormat: 'DD_MMM_YYYY' },
    ];

    for (const patch of patches) {
      expect(validateSync(plainToInstance(UpdateUserPreferencesDto, patch))).toEqual([]);
    }
  });

  it.each([
    { currencyDisplay: 'name' },
    { currencyDisplay: null },
    { themeMode: 'system' },
    { themeMode: null },
    { dateFormat: 'DD-MM-YYYY' },
    { dateFormat: null },
  ])('rejects unsupported values: %j', (patch) => {
    expect(validateSync(plainToInstance(UpdateUserPreferencesDto, patch)).length).toBeGreaterThan(0);
  });
});