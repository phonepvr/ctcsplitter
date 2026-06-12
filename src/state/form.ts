import type {
  Inputs, OfferParamInputs, StructureInputs, EligibilityInputs, LevelId,
} from '../engine/types';
import { DEFAULTS } from '../data/data';

// How the candidate's current-comp line items are entered. The raw numbers in
// CandidateItemized are interpreted per this mode; the engine always receives
// derived ANNUAL totals.
export type EntryMode = 'monthly' | 'annual';

// Candidate current comp as itemised line items (mirrors the Excel
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

// Offer-letter header metadata (does not affect the calculation).
export interface OfferMeta {
  name: string;
  sapCode: string;
  company: string;
  position: string;
  location: string;
  date: string; // ISO yyyy-mm-dd
}

export const EMPTY_META: OfferMeta = {
  name: '', sapCode: '', company: '', position: '', location: '', date: '',
};

/** Offer-letter header rows (label, value); blank optional fields are dropped. */
export function offerHeaderPairs(meta: OfferMeta, level: string, isPlant: boolean): [string, string][] {
  return ([
    ['Name', meta.name],
    ['SAP Code', meta.sapCode],
    ['Company', meta.company],
    ['Level', level],
    ['Location', meta.location],
    ['Position', meta.position],
    ['Plant / Non-plant', isPlant ? 'Plant' : 'Non-plant'],
    ['Date', meta.date],
  ] as [string, string][]).filter(([, v]) => v != null && String(v).trim() !== '');
}

// Manual add-ons (free amounts, no calculation) shown on the offer letter.
export interface Addons {
  retention12: number;
  retention24: number;
  retention36: number;
  joining: number;
  ltip12: number;
  ltip24: number;
  ltip36: number;
  ltip48: number;
}

export const ZERO_ADDONS: Addons = {
  retention12: 0, retention24: 0, retention36: 0, joining: 0,
  ltip12: 0, ltip24: 0, ltip36: 0, ltip48: 0,
};

/** Add-on rows in display/export order, with labels. */
export const ADDON_ROWS: [keyof Addons, string][] = [
  ['retention12', 'Retention bonus — 12 months'],
  ['retention24', 'Retention bonus — 24 months'],
  ['retention36', 'Retention bonus — 36 months'],
  ['joining', 'Joining bonus (in lieu of lost variable)'],
  ['ltip12', 'LTIP — 12 months'],
  ['ltip24', 'LTIP — 24 months'],
  ['ltip36', 'LTIP — 36 months'],
  ['ltip48', 'LTIP — 48 months'],
];

export interface FormState {
  entryMode: EntryMode; // how candidate amounts are entered (monthly | annual)
  candidate: CandidateItemized;
  offer: OfferParamInputs;
  structure: StructureInputs;
  eligibility: EligibilityInputs;
  meta: OfferMeta;
  addons: Addons;
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

export function deriveCandidate(c: CandidateItemized, mode: EntryMode = 'monthly'): DerivedCandidate {
  // Normalise every entered amount to monthly first; annual entries are /12.
  const m = (v: number) => (mode === 'annual' ? v / 12 : v);
  const flexMonthly =
    m(c.educationOfficeWear) + m(c.broadbandFoodGift) + m(c.hra) + m(c.residualChoicePay) +
    m(c.additionalHra) + m(c.fuelMaintenance) + m(c.lta);
  const retiralsMonthly = m(c.pf) + m(c.nps) + m(c.superannuation) + m(c.gratuity);
  const totalFixedMonthly = m(c.basic) + flexMonthly + retiralsMonthly;
  return {
    flexMonthly,
    retiralsMonthly,
    totalFixedMonthly,
    currentAnnualFixedWithoutGratuity: (totalFixedMonthly - m(c.gratuity)) * 12,
    currentAnnualVariable: m(c.variable) * 12,
  };
}

/** Project the UI form onto the engine's Inputs contract. */
export function toInputs(form: FormState): Inputs {
  const d = deriveCandidate(form.candidate, form.entryMode);
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

export function initialForm(level: LevelId, variablePct: number): FormState {
  return {
    // HR feedback: amounts are usually quoted annually — default to annual entry.
    entryMode: 'annual',
    candidate: { ...ZERO_CANDIDATE },
    offer: {
      level, variablePct, finalOption: 2,
      manualOption4Mode: DEFAULTS.manualOption4Mode,
      manualOption4CTC: DEFAULTS.manualOption4CTC,
      manualOption4Pct: DEFAULTS.manualOption4Pct,
      carAllowance: DEFAULTS.carAllowance,
    },
    structure: {
      basicPct: DEFAULTS.basicPct,
      hraPct: DEFAULTS.hraPct,
      npsPct: DEFAULTS.npsPct,
      pf: DEFAULTS.pf,
      foodCouponsMonthly: DEFAULTS.foodCouponsMonthly,
    },
    eligibility: { isPlant: false, isMetro: false, transport: 'N', cea: 'NONE', cha: 'NONE', ber: 'N', lta: 'N' },
    meta: { name: '', sapCode: '', company: '', position: '', location: '', date: new Date().toISOString().slice(0, 10) },
    addons: { ...ZERO_ADDONS },
  };
}
