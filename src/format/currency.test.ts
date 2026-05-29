import { describe, it, expect } from 'vitest';
import { formatINR, groupIndian, formatPct } from './currency';

describe('groupIndian', () => {
  it('groups with the Indian system (last 3, then pairs)', () => {
    expect(groupIndian(1694400)).toBe('16,94,400');
    expect(groupIndian(100000)).toBe('1,00,000');
    expect(groupIndian(1000)).toBe('1,000');
    expect(groupIndian(100)).toBe('100');
    expect(groupIndian(10000000)).toBe('1,00,00,000');
  });

  it('handles paise and negatives', () => {
    expect(groupIndian(81500.64, true)).toBe('81,500.64');
    expect(groupIndian(-30160)).toBe('-30,160');
  });
});

describe('formatINR', () => {
  it('prefixes the rupee symbol and groups Indian-style', () => {
    expect(formatINR(1694400)).toMatch(/^₹\s?16,94,400$/);
    expect(formatINR(10000000)).toMatch(/^₹\s?1,00,00,000$/);
  });

  it('supports the paise toggle', () => {
    expect(formatINR(81500.64, { paise: true })).toMatch(/^₹\s?81,500\.64$/);
  });

  it('strips the symbol for TSV output', () => {
    expect(formatINR(1694400, { symbol: false })).toBe('16,94,400');
    expect(formatINR(81500.64, { symbol: false, paise: true })).toBe('81,500.64');
  });

  it('renders non-finite values as a dash', () => {
    expect(formatINR(Infinity)).toBe('—');
    expect(formatINR(NaN)).toBe('—');
  });
});

describe('formatPct', () => {
  it('formats fractions, optionally signed; null -> dash', () => {
    expect(formatPct(0.150092, true)).toBe('+15.0%');
    expect(formatPct(-0.122898)).toBe('-12.3%');
    expect(formatPct(null)).toBe('—');
  });
});
