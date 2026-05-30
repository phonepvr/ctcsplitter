import type {
  Inputs, OfferResult, OptionResult, OfferSummary, CompStructure, OverAndAbove,
  OfferFlags, StructureLine, StructureGroup, LevelMaster, LevelRecord, FinalOption,
  LevelId, BandConfig,
} from './types';
import { mround } from './rounding';
import {
  INCREMENTS, PF_RATE, GRATUITY_RATE, TRANSPORT_ALLOWANCE_PM, WASHING_ALLOWANCE_PM,
  CEA_PM, CHA_PM, BASIC_PCT_CAP, HRA_METRO_CAP, HRA_NONMETRO_CAP, BAND_CONFIGS, LEVEL_BAND,
} from './constants';

/** Thrown when the chosen level has no record in the (possibly user-loaded) master. */
export class MissingLevelError extends Error {
  constructor(public readonly level: LevelId) {
    super(`No compensation data is loaded for level ${level}. Load the source tables first.`);
    this.name = 'MissingLevelError';
  }
}

function getLevel(master: LevelMaster, level: LevelId): LevelRecord {
  const rec = master.levels[level];
  if (!rec) throw new MissingLevelError(level);
  return rec;
}

/** Suggested variable % for a level — drives the UI default; the engine uses the input. */
export function defaultMpliForLevel(master: LevelMaster, level: LevelId): number | undefined {
  return master.mpliBands[level];
}

/** Band rules for a level (falls back to the level's record band). */
export function bandForLevel(level: LevelId, record?: LevelRecord): BandConfig {
  return BAND_CONFIGS[record?.band ?? LEVEL_BAND[level]];
}

const growth = (num: number, den: number): number | null => (den === 0 ? null : num / den - 1);
const ratio = (num: number, den: number): number => (den === 0 ? 0 : num / den);

export function computeOffer(inputs: Inputs, master: LevelMaster): OfferResult {
  const { candidate, offer, structure, eligibility } = inputs;
  const level = getLevel(master, offer.level);
  const band = bandForLevel(offer.level, level);
  const vfrac = offer.variablePct / 100;

  // ---------- Stage A — four offer options ----------
  const currentCTC =
    candidate.currentAnnualFixedWithoutGratuity + candidate.currentAnnualVariable;

  const options: OptionResult[] = ([1, 2, 3, 4] as FinalOption[]).map((opt) => {
    let totalCTC: number;
    let incrementPct: number | null;
    if (opt === 4) {
      incrementPct = null;
      totalCTC = offer.manualOption4CTC;
    } else {
      incrementPct = INCREMENTS[opt - 1];
      totalCTC = mround(currentCTC * (1 + incrementPct), band.ctcRound);
    }
    let fixed: number;
    let variable: number;
    if (band.variableOfFixed) {
      // M2-M4: APB is a % of Fixed -> Fixed = CTC / (1 + APB%), variable = remainder.
      fixed = mround(totalCTC / (1 + vfrac), band.fixedRound);
      variable = totalCTC - fixed;
    } else {
      // M5-M11: MPLI is a % of CTC.
      variable = mround(totalCTC * vfrac, band.ctcRound);
      fixed = totalCTC - variable;
    }
    return { option: opt, incrementPct, totalCTC, mpli: variable, fixed };
  });

  // ---------- Stage B — chosen option (consistent index = the $D$14 bug fix) ----------
  const chosen = options[offer.finalOption - 1];

  const varRatio = (variable: number, totalCTC: number, fixed: number): number =>
    ratio(variable, band.ratioOfFixed ? fixed : totalCTC);

  const summary: OfferSummary = {
    finalOption: offer.finalOption,
    currentCTC,
    currentFixed: candidate.currentAnnualFixedWithoutGratuity,
    currentVariable: candidate.currentAnnualVariable,
    currentVarRatio: varRatio(candidate.currentAnnualVariable, currentCTC, candidate.currentAnnualFixedWithoutGratuity),
    offerCTC: chosen.totalCTC,
    offerFixed: chosen.fixed,
    offerMPLI: chosen.mpli,
    offerVarRatio: varRatio(chosen.mpli, chosen.totalCTC, chosen.fixed),
    carAllowance: offer.carAllowance,
    totalRemuneration: chosen.totalCTC + offer.carAllowance,
    pctIncFixed: growth(chosen.fixed, candidate.currentAnnualFixedWithoutGratuity),
    pctIncMPLI: growth(chosen.mpli, candidate.currentAnnualVariable),
    pctIncCTC: growth(chosen.totalCTC, currentCTC),
  };

  // ---------- Stage D — compensation structure ----------
  const grandTotalCTC = chosen.totalCTC;
  const totalFixedTarget = chosen.fixed;

  const basicAnnual = (structure.basicPct / 100) * grandTotalCTC; // Basic% is of total CTC
  const hraAnnual = basicAnnual * (structure.hraPct / 100);
  const transportAnnual = (eligibility.transport === 'Y' ? TRANSPORT_ALLOWANCE_PM : 0) * 12;
  const ceaAnnual = CEA_PM[eligibility.cea] * 12;
  const chaAnnual = CHA_PM[eligibility.cha] * 12;
  const foodCouponAnnual = structure.foodCouponsMonthly * 12; // input is MONTHLY
  const washingAnnual = (eligibility.isPlant ? WASHING_ALLOWANCE_PM : 0) * 12;

  const berAnnual = (eligibility.ber === 'Y' ? level.berPm : 0) * 12;
  const ltaAnnual = (eligibility.lta === 'Y' ? level.ltaPm : 0) * 12;
  const totalReimbB = berAnnual + ltaAnnual;

  const pfAnnual = structure.pf === 'Y' ? basicAnnual * PF_RATE : 0;
  const npsAnnual = (structure.npsPct / 100) * basicAnnual;
  const totalRetiralsC = pfAnnual + npsAnnual;
  const bPlusC = totalReimbB + totalRetiralsC;

  // Personal Allowance = balancing plug. Transport is intentionally NOT subtracted
  // (faithful to the Excel), so with transport=Y the components overshoot the target.
  const personalAllowance =
    totalFixedTarget - bPlusC - basicAnnual - hraAnnual -
    foodCouponAnnual - washingAnnual - ceaAnnual - chaAnnual;

  const totalA =
    basicAnnual + hraAnnual + personalAllowance + transportAnnual +
    ceaAnnual + chaAnnual + foodCouponAnnual + washingAnnual;
  const componentFixedSum = totalA + bPlusC;

  const mk = (
    key: string, label: string, annual: number, group: StructureGroup, isSubtotal = false,
  ): StructureLine => ({ key, label, annual, monthly: annual / 12, group, isSubtotal });

  const lines: StructureLine[] = [
    mk('basic', 'Basic Pay', basicAnnual, 'A'),
    mk('hra', 'HRA / Notional Value', hraAnnual, 'A'),
    mk('personalAllowance', 'Personal Allowance', personalAllowance, 'A'),
    mk('transport', 'Transport Allowance (handicap only)', transportAnnual, 'A'),
    mk('cea', 'Children Education Allowance', ceaAnnual, 'A'),
    mk('cha', 'Children Hostel Allowance', chaAnnual, 'A'),
    mk('foodCoupons', 'Food Coupons', foodCouponAnnual, 'A'),
    mk('washing', 'Washing / Uniform Maintenance Allowance', washingAnnual, 'A'),
    mk('totalA', 'Total A', totalA, 'A', true),
    mk('ber', 'Business Expense Reimbursement', berAnnual, 'B'),
    mk('lta', 'Leave Travel Allowance', ltaAnnual, 'B'),
    mk('totalReimbB', 'Total Reimbursements B', totalReimbB, 'B', true),
    mk('pf', 'Provident Fund (Employer Share)', pfAnnual, 'C'),
    mk('nps', 'National Pension System (NPS)', npsAnnual, 'C'),
    mk('totalRetiralsC', 'Total Retirals C', totalRetiralsC, 'C', true),
    mk('bPlusC', 'B + C (Reimbursements + Retirals)', bPlusC, 'BC', true),
    mk('totalFixed', 'Total Fixed Salary (A + B + C)', totalFixedTarget, 'TOTAL', true),
    mk('mpli', band.variableLineLabel, chosen.mpli, 'MPLI'),
    mk('grandTotal', 'Grand Total (Annual Target CTC)', grandTotalCTC, 'TOTAL', true),
  ];
  if (band.hasCarAllowance) {
    lines.push(mk('carAllowance', 'Car Allowance', offer.carAllowance, 'EXTRA'));
    lines.push(mk('totalRemuneration', 'Total Remuneration', grandTotalCTC + offer.carAllowance, 'TOTAL', true));
  }

  const structureOut: CompStructure = {
    lines, totalA, totalReimbB, totalRetiralsC, bPlusC,
    totalFixedTarget, componentFixedSum, mpli: chosen.mpli, grandTotalCTC, basicAnnual,
  };

  // ---------- Stage C — over-and-above (by level) ----------
  const overAndAbove: OverAndAbove = {
    mediclaimAnnual: level.hiPa,
    groupPersonalAccidentAnnual: level.gpaPa,
    termInsuranceAnnual: level.tlPa,
    mobileReimb: band.mobileAnnual ? level.mobileReimbPa ?? 0 : level.mbrPm,
    mobileReimbIsAnnual: band.mobileAnnual,
    gratuityAnnual: basicAnnual * GRATUITY_RATE,
  };

  // ---------- Reconciliation flags ----------
  const knownOvershoot = eligibility.transport === 'Y' ? transportAnnual : 0;
  const flags: OfferFlags = {
    transportOvershoot: eligibility.transport === 'Y',
    transportOvershootAmount: knownOvershoot,
    negativePersonalAllowance: personalAllowance < 0,
    componentMismatch: Math.abs(componentFixedSum - knownOvershoot - totalFixedTarget) > 1,
    basicCapExceeded: structure.basicPct > BASIC_PCT_CAP,
    hraCapExceeded: structure.hraPct > (eligibility.isMetro ? HRA_METRO_CAP : HRA_NONMETRO_CAP) * 100,
  };

  return { band, options, summary, structure: structureOut, overAndAbove, flags };
}
