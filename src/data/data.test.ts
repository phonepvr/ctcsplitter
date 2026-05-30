import { describe, it, expect } from 'vitest';
import { validateLevelMaster, DataValidationError } from './dataSchema';
import { parseUserJson } from './dataProvider';
import { bundledMaster } from './levelMaster';
import { normalizeChildCount, LEVEL_OPTIONS } from './data';
import sample from '../../sample-data/level-master.json';

describe('bundled master', () => {
  it('contains all seven M-5..M-11 levels', () => {
    for (const id of LEVEL_OPTIONS) {
      expect(bundledMaster.levels[id]).toBeDefined();
    }
  });
});

describe('validateLevelMaster', () => {
  it('accepts the shipped sample JSON and types it', () => {
    const master = validateLevelMaster(sample);
    expect(Object.keys(master.levels)).toHaveLength(10);
    expect(master.source).toBe('user-json');
    const m9 = master.levels['M-9']!;
    expect(m9.mbrPm).toBe(425);
    expect(m9.hiPa).toBe(450000);
    expect(m9.gpaPa).toBe(5000000);
    expect(m9.tlPa).toBe(5000000);
    expect(master.mpliBands['M-9']).toBe(12);
  });

  it('agrees with the bundled master on key M-9 figures', () => {
    const master = validateLevelMaster(sample);
    const a = master.levels['M-9']!;
    const b = bundledMaster.levels['M-9']!;
    expect(a.hiPa).toBe(b.hiPa);
    expect(a.gpaPa).toBe(b.gpaPa);
    expect(a.tlPa).toBe(b.tlPa);
    expect(a.berPm).toBe(b.berPm);
  });

  it('rejects a missing levels object', () => {
    expect(() => validateLevelMaster({})).toThrow(DataValidationError);
  });

  it('rejects a non-numeric field', () => {
    const bad = { levels: { 'M-9': { berPm: 'lots', transportPm: 1600, ltaPm: 833, variablePct: 0.12, mbrPm: 425, mhrLabel: '3000', hiPa: 450000, tlPa: 5000000, vpAmt: 35000, gpaPa: 5000000 } } };
    expect(() => validateLevelMaster(bad)).toThrow(/berPm/);
  });
});

describe('parseUserJson', () => {
  it('throws a friendly error on malformed JSON', () => {
    expect(() => parseUserJson('{ not json ')).toThrow(/not valid JSON/);
  });
  it('round-trips a stringified master', () => {
    const master = parseUserJson(JSON.stringify(sample));
    expect(master.levels['M-5']).toBeDefined();
  });
});

describe('normalizeChildCount', () => {
  it('is case-insensitive and accepts shorthands', () => {
    expect(normalizeChildCount('Y for 1 Child')).toBe('ONE');
    expect(normalizeChildCount('y for 2 children')).toBe('TWO');
    expect(normalizeChildCount('2')).toBe('TWO');
    expect(normalizeChildCount('anything else')).toBe('NONE');
  });
});
