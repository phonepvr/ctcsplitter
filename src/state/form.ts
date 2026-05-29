import type {
  Inputs, OfferParamInputs, StructureInputs, EligibilityInputs, LevelId, MpliPct,
} from '../engine/types';
import { DEFAULTS } from '../data/data';

// Candidate current comp as itemised MONTHLY line items (mirrors the Excel
// "Candidate Current Comp Structur" sheet). The engine only needs the two
// derived annual totals, computed by `deriveCandidate`.
export interface CandidateItemized {
  basic: number;
  educationOfficeWear: number;
  broadbandFoodGift: number;
  hra: number;
  residualChoicePay: number;
  additionalHra: number;
  fuelMaintenance: number;
  lta: number;
  pf: number;
  nps: number;
  superannuation: number;
  gratuity: number;
  variable: number;
}

export interface FormState {
  candidate: CandidateItemized;
  offer: OfferParamInputs;
  structure: StructureInputs;
  eligibility: EligibilityInputs;
}

export const ZERO_CANDIDATE: CandidateItemized = {
  basic: 0,
  educationOfficeWear: 0,
  broadbandFoodGift: 0,
  hra: 0,
  residualChoicePay: 0,
  additionalHra: 0,
  fuelMaintenance: 0,
  lta: 0,
  pf: 0,
  nps: 0,
  superannuation: 0,
  gratuity: 0,
  variable: 0,
};

export interface DerivedCandidate {
  flexMonthly: number;
  retiralsMonthly: number;
  totalFixedMonthly: number;
  currentAnnualFixedWithoutGratuity: number;
  currentAnnualVariable: number;
}

export function deriveCandidate(c: CandidateItemized): DerivedCandidate {
  const flexMonthly =
    c.educationOfficeWear + c.broadbandFoodGift + c.hra + c.residualChoicePay +
    c.additionalHra + c.fuelMaintenance + c.lta;
  const retiralsMonthly = c.pf + c.nps + c.superannuation + c.gratuity;
  const totalFixedMonthly = c.basic + flexMonthly + retiralsMonthly;
  return {
    flexMonthly,
    retiralsMonthly,
    totalFixedMonthly,
    currentAnnualFixedWithoutGratuity: (totalFixedMonthly - c.gratuity) * 12,
    currentAnnualVariable: c.variable * 12,
  };
}

/** Project the UI form onto the engine's Inputs contract. */
export function toInputs(form: FormState): Inputs {
  const d = deriveCandidate(form.candidate);
  return {
    candidate: {
      currentAnnualFixedWithoutGratuity: d.currentAnnualFixedWithoutGratuity,
      currentAnnualVariable: d.currentAnnualVariable,
    },
    offer: form.offer,
    structure: form.structure,
    eligibility: form.eligibility,
  };
}

export function initialForm(level: LevelId, mpliPct: MpliPct): FormState {
  return {
    candidate: { ...ZERO_CANDIDATE },
    offer: { level, mpliPct, finalOption: 2, manualOption4CTC: DEFAULTS.manualOption4CTC },
    structure: {
      basicPct: DEFAULTS.basicPct,
      hraPct: DEFAULTS.hraPct,
      npsPct: DEFAULTS.npsPct,
      pf: DEFAULTS.pf,
      foodCouponsMonthly: DEFAULTS.foodCouponsMonthly,
    },
    eligibility: { isPlant: false, transport: 'N', cea: 'NONE', cha: 'NONE', ber: 'N', lta: 'N' },
  };
}
