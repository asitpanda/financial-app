import { describe, expect, it } from 'vitest';
import {
  getProfitLossHexColor,
  getProfitLossMuiColor,
  getProfitLossReadableHexColor,
  getProfitLossTooltipHexColor,
  getSignedValuePrefix,
} from './colors';

describe('financial color helpers', () => {
  it('uses gain colors for positive values', () => {
    expect(getProfitLossMuiColor(10)).toBe('success.main');
    expect(getProfitLossHexColor(10)).toBe('#10b981');
    expect(getProfitLossReadableHexColor(10)).toBe('#15803d');
    expect(getProfitLossTooltipHexColor(10)).toBe('#86efac');
  });

  it('uses loss colors for negative values', () => {
    expect(getProfitLossMuiColor(-10)).toBe('error.main');
    expect(getProfitLossHexColor(-10)).toBe('#ef4444');
    expect(getProfitLossReadableHexColor(-10)).toBe('#be123c');
    expect(getProfitLossTooltipHexColor(-10)).toBe('#fda4af');
  });

  it('keeps zero neutral by default', () => {
    expect(getProfitLossMuiColor(0)).toBe('text.primary');
    expect(getProfitLossHexColor(0)).toBe('#0f172a');
    expect(getProfitLossReadableHexColor(0)).toBe('#0f172a');
    expect(getProfitLossTooltipHexColor(0)).toBe('#e2e8f0');
  });

  it('allows zero to use gain or loss semantics explicitly', () => {
    expect(getProfitLossMuiColor(0, 'gain')).toBe('success.main');
    expect(getProfitLossHexColor(0, 'loss')).toBe('#ef4444');
    expect(getProfitLossReadableHexColor(0, 'gain')).toBe('#15803d');
    expect(getProfitLossTooltipHexColor(0, 'loss')).toBe('#fda4af');
  });

  it('formats signed value prefixes', () => {
    expect(getSignedValuePrefix(5)).toBe('+');
    expect(getSignedValuePrefix(-5)).toBe('-');
    expect(getSignedValuePrefix(0)).toBe('');
    expect(getSignedValuePrefix(0, true)).toBe('+');
  });
});