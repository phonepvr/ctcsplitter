import type {
  Inputs, OfferResult, OptionResult, OfferSummary, CompStructure, OverAndAbove,
  OfferFlags, StructureLine, StructureGroup, LevelMaster, LevelRecord, FinalOption,
  MpliPct, LevelId,
} from './types';
import { mround } from './rounding';
import {
  INCREMENTS, PF_RATE, GRATUITY_RATE, TRANSPORT_ALLOWANCE_PM, WASHING_ALLOWANCE_PM,
  CEA_PM, CHA_PM, BASIC_PCT_CAP, HRA_METRO_CAP, HRA_NONMETRO_CAP,
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

/** Suggested MPLI% for a level — drives the UI default; the engine uses the explicit input. */
export function defaultMpliForLevel(master: LevelMaster, level: LevelId): MpliPct | undefined {
  return master.mpliBands[level];
}

const growth = (num: number, den: number): number | null => (den === 0 ? null : num / den - 1);
const ratio = (num: number, den: number): number => (den === 0 ? 0 : num / den);

/**
 * The single pure entry point. Takes typed Inputs and an injected LevelMaster,
 * returns a fully-derived OfferResult. No I/O, no DOM, no globals.
 */
export function computeOffer(inputs: Inputs, master: LevelMaster): OfferResult {
  const { candidate, offer, structure, eligibility } = inputs;
  const level = getLevel(master, offer.level);
  const mpliFrac = offer.mpliPct / 100;

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
      totalCTC = mround(currentCTC * (1 + incrementPct));
    }
    const mpli = mround(totalCTC * mpliFrac);
    return { option: opt, incrementPct, totalCTC, mpli, fixed: totalCTC - mpli };
  });

  // ---------- Stage B — chosen option ----------
  // Consistent index-based selection. This is the deliberate fix for the Excel
  // bug where the option-3 branch tested $D$14 (blank) instead of $D$15 and
  // returned 0; here option f always yields option f's Fixed/MPLI/CTC.
  const chosen = options[offer.finalOption - 1];

  const summary: OfferSummary = {
    finalOption: offer.finalOption,
    currentCTC,
    currentFixed: candidate.currentAnnualFixedWithoutGratuity,
    currentVariable: candidate.currentAnnualVariable,
    currentVarToTotal: ratio(candidate.currentAnnualVariable, currentCTC),
    offerCTC: chosen.totalCTC,
    offerFixed: chosen.fixed,
    offerMPLI: chosen.mpli,
    offerVarToTotal: ratio(chosen.mpli, chosen.totalCTC),
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
  // here (faithful to the Excel), so with transport=Y the component sum overshoots
  // the target by exactly the annual transport — surfaced via flags.transportOvershoot.
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
    mk('mpli', 'MPLI (Monthly Performance Linked Incentive)', chosen.mpli, 'MPLI'),
    mk('grandTotal', 'Grand Total (Annual Target CTC)', grandTotalCTC, 'TOTAL', true),
  ];

  const structureOut: CompStructure = {
    lines, totalA, totalReimbB, totalRetiralsC, bPlusC,
    totalFixedTarget, componentFixedSum, mpli: chosen.mpli, grandTotalCTC, basicAnnual,
  };

  // ---------- Stage C — over-and-above (by level) ----------
  const overAndAbove: OverAndAbove = {
    mediclaimAnnual: level.hiPa,
    groupPersonalAccidentAnnual: level.gpaPa,
    termInsuranceAnnual: level.tlPa,
    mobileReimbMonthly: level.mbrPm,
    gratuityAnnual: basicAnnual * GRATUITY_RATE,
  };

  // ---------- Reconciliation flags ----------
  const knownOvershoot = eligibility.transport === 'Y' ? transportAnnual : 0;
  const flags: OfferFlags = {
    transportOvershoot: eligibility.transport === 'Y',
    transportOvershootAmount: knownOvershoot,
    negativePersonalAllowance: personalAllowance < 0,
    // Residual mismatch after removing the known transport quirk (tolerates float noise).
    componentMismatch: Math.abs(componentFixedSum - knownOvershoot - totalFixedTarget) > 1,
    basicCapExceeded: structure.basicPct > BASIC_PCT_CAP,
    hraCapExceeded: structure.hraPct > (eligibility.isMetro ? HRA_METRO_CAP : HRA_NONMETRO_CAP) * 100,
  };

  return { options, summary, structure: structureOut, overAndAbove, flags };
}
