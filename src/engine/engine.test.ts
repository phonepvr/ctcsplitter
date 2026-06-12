import { describe, it, expect } from 'vitest';
import { computeOffer, defaultMpliForLevel, displayLines, suggestBasicPct, MissingLevelError } from './engine';
import { bundledMaster } from '../data/levelMaster';
import { emptyMaster } from '../data/dataProvider';
import type { Inputs, OfferResult } from './types';

// The acceptance / golden case from the source workbook.
const golden: Inputs = {
  candidate: { currentAnnualFixedWithoutGratuity: 3104004, currentAnnualVariable: 579180 },
  offer: { level: 'M-9', variablePct: 12, finalOption: 2, manualOption4Mode: 'amount', manualOption4CTC: 15_000_000, manualOption4Pct: 15, carAllowance: 0 },
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
    expect(r.summary.offerVarRatio).toBeCloseTo(0.119924, 5);
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
    expect(r.overAndAbove.mobileReimb).toBe(425);
    expect(r.overAndAbove.mobileReimbIsAnnual).toBe(false);
    expect(r.overAndAbove.gratuityAnnual).toBeCloseTo(81500.64, 2);
    expect(r.band.id).toBe('M5-M11');
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
    expect(r.options[3].incrementPct).toBeNull();
  });

  it('option 4 supports a custom % increase', () => {
    const r = computeOffer(
      { ...golden, offer: { ...golden.offer, finalOption: 4, manualOption4Mode: 'percent', manualOption4Pct: 18 } },
      bundledMaster,
    );
    expect(r.options[3].totalCTC).toBe(4346000); // mround(3683184 × 1.18, 1000)
    expect(r.options[3].incrementPct).toBeCloseTo(0.18, 10);
    expect(r.summary.offerCTC).toBe(4346000);
    expect(r.summary.offerMPLI).toBe(522000); // mround(4346000 × 12%, 1000)
    expect(r.summary.offerFixed).toBe(3824000);
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

  it('suggests the correct variable band per level', () => {
    expect(defaultMpliForLevel(bundledMaster, 'M-9')).toBe(12);
    expect(defaultMpliForLevel(bundledMaster, 'M-8')).toBe(15);
    expect(defaultMpliForLevel(bundledMaster, 'M-5')).toBe(20);
    // M2-M4 default APB = 25% of Fixed ≡ 20% of CTC (HR-confirmed policy)
    expect(defaultMpliForLevel(bundledMaster, 'M-2')).toBe(25);
    expect(defaultMpliForLevel(bundledMaster, 'M-4')).toBe(25);
  });

  it('hides unselected (zero) components on the fitment view, keeping totals', () => {
    const r = computeOffer(golden, bundledMaster); // lta N, nps 0
    const keys = displayLines(r.structure, true).map((l) => l.key);
    expect(keys).not.toContain('lta');
    expect(keys).not.toContain('nps');
    expect(keys).toContain('totalReimbB'); // non-zero subtotal stays
    expect(keys).toContain('totalRetiralsC');
    expect(keys).toContain('personalAllowance');
    // full (unfiltered) view still has everything
    expect(displayLines(r.structure, false).map((l) => l.key)).toContain('lta');
  });

  it('drops zero subtotals too (PF off, NPS 0 -> no retirals section)', () => {
    const r = computeOffer({ ...golden, structure: { ...golden.structure, pf: 'N', npsPct: 0 } }, bundledMaster);
    const keys = displayLines(r.structure, true).map((l) => l.key);
    expect(keys).not.toContain('pf');
    expect(keys).not.toContain('totalRetiralsC');
    expect(keys).toContain('bPlusC'); // BER still non-zero
  });

  it('throws MissingLevelError when no data is loaded for the level', () => {
    expect(() => computeOffer(golden, emptyMaster)).toThrow(MissingLevelError);
  });
});

describe('computeOffer — M2-M4 band (M-2, APB 25%, option 2)', () => {
  const m2: Inputs = {
    candidate: { currentAnnualFixedWithoutGratuity: 3104004, currentAnnualVariable: 579180 },
    offer: { level: 'M-2', variablePct: 25, finalOption: 2, manualOption4Mode: 'amount', manualOption4CTC: 15_000_000, manualOption4Pct: 15, carAllowance: 0 },
    structure: { basicPct: 40, hraPct: 40, npsPct: 0, pf: 'Y', foodCouponsMonthly: 9600 },
    eligibility: { isPlant: true, isMetro: false, transport: 'Y', cea: 'ONE', cha: 'ONE', ber: 'Y', lta: 'N' },
  };
  const r = computeOffer(m2, bundledMaster);

  it('uses APB-of-fixed maths and 500 CTC rounding', () => {
    expect(r.band.id).toBe('M2-M4');
    expect(r.options[1].totalCTC).toBe(4235500); // MROUND(3683184*1.15, 500)
    expect(r.options[1].fixed).toBe(3388000); // MROUND(4235500/1.25, 1000)
    expect(r.options[1].mpli).toBe(847500); // APB = CTC - Fixed
    expect(r.summary.offerVarRatio).toBeCloseTo(0.250148, 5); // APB / Fixed (Fixed is rounded)
  });

  it('reproduces the M-2 structure incl. the negative Personal Allowance', () => {
    expect(lineAnnual(r, 'basic')).toBeCloseTo(1694200, 2);
    expect(lineAnnual(r, 'hra')).toBeCloseTo(677680, 2);
    expect(lineAnnual(r, 'ber')).toBe(720000); // 60000 x 12
    expect(lineAnnual(r, 'personalAllowance')).toBeCloseTo(-178384, 2);
    expect(r.flags.negativePersonalAllowance).toBe(true);
    expect(r.structure.grandTotalCTC).toBe(4235500);
  });

  it('takes over-and-above from Source M1-M4 (mobile is annual)', () => {
    expect(r.overAndAbove.mediclaimAnnual).toBe(1000000);
    expect(r.overAndAbove.groupPersonalAccidentAnnual).toBe(20000000);
    expect(r.overAndAbove.termInsuranceAnnual).toBe(20000000);
    expect(r.overAndAbove.mobileReimb).toBe(9000);
    expect(r.overAndAbove.mobileReimbIsAnnual).toBe(true);
    expect(r.overAndAbove.gratuityAnnual).toBeCloseTo(81491.02, 2);
  });

  it('exposes Car Allowance and Total Remuneration (only when non-zero)', () => {
    const ca = computeOffer({ ...m2, offer: { ...m2.offer, carAllowance: 120000 } }, bundledMaster);
    expect(lineAnnual(ca, 'carAllowance')).toBe(120000);
    expect(ca.summary.totalRemuneration).toBe(4235500 + 120000);
    // zero car allowance -> the redundant rows are not emitted at all
    const keys = r.structure.lines.map((l) => l.key);
    expect(keys).not.toContain('carAllowance');
    expect(keys).not.toContain('totalRemuneration');
  });

  it('suggests a workable Basic% when Personal Allowance goes negative', () => {
    expect(r.flags.negativePersonalAllowance).toBe(true);
    const fix = suggestBasicPct(m2, bundledMaster, [30, 35, 40, 45, 50]);
    expect(fix).not.toBeNull();
    expect(fix!.basicPct).toBe(35); // largest option below 40 with PA >= 0
    expect(fix!.personalAllowance).toBeGreaterThanOrEqual(0);
  });
});
