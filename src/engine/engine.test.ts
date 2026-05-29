import { describe, it, expect } from 'vitest';
import { computeOffer, defaultMpliForLevel, MissingLevelError } from './engine';
import { bundledMaster } from '../data/levelMaster';
import { emptyMaster } from '../data/dataProvider';
import type { Inputs, OfferResult } from './types';

// The acceptance / golden case from the source workbook.
const golden: Inputs = {
  candidate: { currentAnnualFixedWithoutGratuity: 3104004, currentAnnualVariable: 579180 },
  offer: { level: 'M-9', mpliPct: 12, finalOption: 2, manualOption4CTC: 15_000_000 },
  structure: { basicPct: 40, hraPct: 40, npsPct: 0, pf: 'Y', foodCouponsMonthly: 9600 },
  eligibility: { isPlant: true, isMetro: false, transport: 'Y', cea: 'ONE', cha: 'ONE', ber: 'Y', lta: 'N' },
};

const lineAnnual = (r: OfferResult, key: string): number =>
  r.structure.lines.find((l) => l.key === key)!.annual;

describe('computeOffer — golden case (M-9, +15%, option 2)', () => {
  const r = computeOffer(golden, bundledMaster);

  it('produces the four offer options', () => {
    expect(r.options.map((o) => o.totalCTC)).toEqual([4052000, 4236000, 4420000, 15_000_000]);
    expect(r.options.map((o) => o.mpli)).toEqual([486000, 508000, 530000, 1_800_000]);
    expect(r.options.map((o) => o.fixed)).toEqual([3566000, 3728000, 3890000, 13_200_000]);
    expect(r.options[3].incrementPct).toBeNull();
  });

  it('summarises the chosen option (2)', () => {
    expect(r.summary.offerCTC).toBe(4236000);
    expect(r.summary.offerFixed).toBe(3728000);
    expect(r.summary.offerMPLI).toBe(508000);
    expect(r.summary.currentCTC).toBe(3683184);
    expect(r.summary.pctIncFixed!).toBeCloseTo(0.201029, 5);
    expect(r.summary.pctIncMPLI!).toBeCloseTo(-0.122898, 5);
    expect(r.summary.pctIncCTC!).toBeCloseTo(0.150092, 5);
    expect(r.summary.offerVarToTotal).toBeCloseTo(0.119924, 5);
  });

  it('builds the compensation structure to spec', () => {
    expect(lineAnnual(r, 'basic')).toBeCloseTo(1694400, 2);
    expect(lineAnnual(r, 'hra')).toBeCloseTo(677760, 2);
    expect(lineAnnual(r, 'pf')).toBeCloseTo(203328, 2);
    expect(lineAnnual(r, 'personalAllowance')).toBeCloseTo(701312, 2);
    expect(r.structure.totalA).toBeCloseTo(3363872, 2);
    expect(r.structure.grandTotalCTC).toBe(4236000);
    expect(r.structure.basicAnnual).toBeCloseTo(1694400, 2);
    // monthly column = annual / 12
    const basic = r.structure.lines.find((l) => l.key === 'basic')!;
    expect(basic.monthly).toBeCloseTo(141200, 2);
  });

  it('computes over-and-above by level', () => {
    expect(r.overAndAbove.mediclaimAnnual).toBe(450000);
    expect(r.overAndAbove.groupPersonalAccidentAnnual).toBe(5000000);
    expect(r.overAndAbove.termInsuranceAnnual).toBe(5000000);
    expect(r.overAndAbove.mobileReimbMonthly).toBe(425);
    expect(r.overAndAbove.gratuityAnnual).toBeCloseTo(81500.64, 2);
  });

  it('flags the transport overshoot but not a mismatch', () => {
    expect(r.flags.transportOvershoot).toBe(true);
    expect(r.flags.transportOvershootAmount).toBe(19200);
    expect(r.flags.negativePersonalAllowance).toBe(false);
    expect(r.flags.componentMismatch).toBe(false);
    expect(r.flags.basicCapExceeded).toBe(false);
    expect(r.flags.hraCapExceeded).toBe(false);
    // the components really do overshoot the target by the transport amount
    expect(r.structure.componentFixedSum - r.structure.totalFixedTarget).toBeCloseTo(19200, 2);
  });
});

describe('computeOffer — edge cases', () => {
  it('option 3 selects the +20% values (regression for the $D$14 bug)', () => {
    const r = computeOffer({ ...golden, offer: { ...golden.offer, finalOption: 3 } }, bundledMaster);
    expect(r.summary.offerCTC).toBe(r.options[2].totalCTC);
    expect(r.summary.offerCTC).toBe(4420000);
    expect(r.summary.offerCTC).not.toBe(0);
  });

  it('option 4 uses the manual absolute CTC', () => {
    const r = computeOffer({ ...golden, offer: { ...golden.offer, finalOption: 4 } }, bundledMaster);
    expect(r.summary.offerCTC).toBe(15_000_000);
    expect(r.summary.offerMPLI).toBe(1_800_000);
    expect(r.summary.offerFixed).toBe(13_200_000);
  });

  it('flags a negative Personal Allowance when Basic% / HRA% are too high', () => {
    const r = computeOffer(
      {
        ...golden,
        structure: { ...golden.structure, basicPct: 50, hraPct: 60 },
        eligibility: { ...golden.eligibility, transport: 'N', ber: 'N' },
      },
      bundledMaster,
    );
    expect(lineAnnual(r, 'personalAllowance')).toBeLessThan(0);
    expect(r.flags.negativePersonalAllowance).toBe(true);
  });

  it('ties out exactly (no overshoot) when transport is N', () => {
    const r = computeOffer({ ...golden, eligibility: { ...golden.eligibility, transport: 'N' } }, bundledMaster);
    expect(r.flags.transportOvershoot).toBe(false);
    expect(r.flags.componentMismatch).toBe(false);
    expect(r.structure.componentFixedSum).toBeCloseTo(r.structure.totalFixedTarget, 2);
    expect(lineAnnual(r, 'personalAllowance')).toBeCloseTo(701312, 2);
  });

  it('zeroes retirals when PF=N and NPS=0', () => {
    const r = computeOffer({ ...golden, structure: { ...golden.structure, pf: 'N', npsPct: 0 } }, bundledMaster);
    expect(r.structure.totalRetiralsC).toBe(0);
    expect(lineAnnual(r, 'pf')).toBe(0);
    expect(r.structure.grandTotalCTC).toBe(r.summary.offerCTC);
  });

  it('drops washing allowance for non-plant locations', () => {
    const r = computeOffer({ ...golden, eligibility: { ...golden.eligibility, isPlant: false } }, bundledMaster);
    expect(lineAnnual(r, 'washing')).toBe(0);
  });

  it('computes CEA/CHA variants (×12) including none', () => {
    const two = computeOffer({ ...golden, eligibility: { ...golden.eligibility, cea: 'TWO', cha: 'TWO' } }, bundledMaster);
    expect(lineAnnual(two, 'cea')).toBe(72000);
    expect(lineAnnual(two, 'cha')).toBe(216000);
    const none = computeOffer({ ...golden, eligibility: { ...golden.eligibility, cea: 'NONE', cha: 'NONE' } }, bundledMaster);
    expect(lineAnnual(none, 'cea')).toBe(0);
    expect(lineAnnual(none, 'cha')).toBe(0);
  });

  it('adds BER and LTA (per-month × 12) for M-9 when eligible', () => {
    const r = computeOffer({ ...golden, eligibility: { ...golden.eligibility, ber: 'Y', lta: 'Y' } }, bundledMaster);
    expect(lineAnnual(r, 'ber')).toBe(180000); // 15000 × 12
    expect(lineAnnual(r, 'lta')).toBeCloseTo(10000, 2); // (2500/3) × 12
  });

  it('flags Basic% and HRA% cap breaches (metro-aware)', () => {
    const nonMetro = computeOffer(
      { ...golden, structure: { ...golden.structure, basicPct: 50, hraPct: 60 }, eligibility: { ...golden.eligibility, isMetro: false } },
      bundledMaster,
    );
    expect(nonMetro.flags.basicCapExceeded).toBe(true); // 50 > 40
    expect(nonMetro.flags.hraCapExceeded).toBe(true); // 60 > 50 (non-metro)
    const metro = computeOffer(
      { ...golden, structure: { ...golden.structure, basicPct: 40, hraPct: 60 }, eligibility: { ...golden.eligibility, isMetro: true } },
      bundledMaster,
    );
    expect(metro.flags.basicCapExceeded).toBe(false); // 40 is the cap, not above it
    expect(metro.flags.hraCapExceeded).toBe(false); // 60 == metro cap, not above
  });

  it('suggests the correct MPLI band per level', () => {
    expect(defaultMpliForLevel(bundledMaster, 'M-9')).toBe(12);
    expect(defaultMpliForLevel(bundledMaster, 'M-8')).toBe(15);
    expect(defaultMpliForLevel(bundledMaster, 'M-5')).toBe(20);
  });

  it('throws MissingLevelError when no data is loaded for the level', () => {
    expect(() => computeOffer(golden, emptyMaster)).toThrow(MissingLevelError);
  });
});
