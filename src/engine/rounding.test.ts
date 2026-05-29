import { describe, it, expect } from 'vitest';
import { mround } from './rounding';

describe('mround', () => {
  it('rounds halves away from zero', () => {
    expect(mround(1500)).toBe(2000);
    expect(mround(2500)).toBe(3000);
    expect(mround(1499)).toBe(1000);
    expect(mround(500)).toBe(1000);
    expect(mround(499)).toBe(0);
  });

  it('leaves exact multiples and zero unchanged', () => {
    expect(mround(0)).toBe(0);
    expect(mround(1000)).toBe(1000);
    expect(mround(4236000)).toBe(4236000);
  });

  it('matches the Excel offer-sheet cases', () => {
    expect(mround(3683184 * 1.1)).toBe(4052000);
    expect(mround(3683184 * 1.15)).toBe(4236000);
    expect(mround(3683184 * 1.2)).toBe(4420000);
    expect(mround(4236000 * 0.12)).toBe(508000);
  });

  it('supports custom multiples', () => {
    expect(mround(127, 50)).toBe(150);
    expect(mround(124, 50)).toBe(100);
  });
});
