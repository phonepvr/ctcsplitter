// ============================================================================
// Core types for the CTC offer engine.
// The engine is pure: computeOffer(Inputs, LevelMaster) -> OfferResult.
// All money values are in INR. "annual" unless a field name says monthly/pm.
//
// Two compensation "bands" are supported, with different maths (see BandConfig):
//   - M5-M11: variable = MPLI as % of CTC; CTC rounds to 1000.
//   - M2-M4 : variable = APB as % of Fixed; CTC rounds to 500; Fixed rounds to 1000.
// ============================================================================

// ----- Enumerations / option unions -----
export type LevelId = 'M-2' | 'M-3' | 'M-4' | 'M-5' | 'M-6' | 'M-7' | 'M-8' | 'M-9' | 'M-10' | 'M-11';

export type BandId = 'M2-M4' | 'M5-M11';

export type YesNo = 'Y' | 'N';

export type BasicPct = 30 | 35 | 40 | 45 | 50;
export type HraPct = 0 | 30 | 40 | 50 | 60;
export type MpliPct = 12 | 15 | 20; // M5-M11 MPLI options (kept for the data layer)
export type NpsPct = number; // 0..10 (M5-M11) or 0..14 (M2-M4)

// Children Education / Hostel allowance selection. Source labels are
// case-insensitive ("Y for 1 Child" / "Y for 2 Children"); normalised here.
export type ChildCount = 'NONE' | 'ONE' | 'TWO';

export type FinalOption = 1 | 2 | 3 | 4;

// Per-band rules that drive the engine and UI labels.
export interface BandConfig {
  id: BandId;
  ctcRound: number; // MROUND step for Total CTC (1000 | 500)
  fixedRound: number; // MROUND step for Fixed (used when variableOfFixed)
  variableOfFixed: boolean; // true: variable = % of Fixed (APB); false: % of CTC (MPLI)
  variableShortLabel: string; // 'APB' | 'MPLI'
  variableLineLabel: string; // full label for the structure row
  variablePctLabel: string; // 'APB %' | 'MPLI %'
  variablePctOptions: number[];
  npsMaxPct: number; // 10 | 14
  mobileAnnual: boolean; // M2-M4: mobile reimb is annual; M5-M11: monthly
  hasCarAllowance: boolean; // M2-M4 carries a Car Allowance / Total Remuneration
  ratioOfFixed: boolean; // variable ratio basis: Fixed (M2-M4) vs Total CTC (M5-M11)
}

// ----- Group 1: candidate current compensation -----
export interface CandidateInputs {
  currentAnnualFixedWithoutGratuity: number;
  currentAnnualVariable: number;
}

// ----- Group 2: level & offer parameters -----
export interface OfferParamInputs {
  level: LevelId;
  variablePct: number; // MPLI% (of CTC) for M5-M11, or APB% (of Fixed) for M2-M4
  finalOption: FinalOption; // 1|2|3 = +10/15/20%, 4 = manual absolute CTC
  manualOption4CTC: number; // used only when finalOption === 4
  carAllowance: number; // offer car allowance p.a. (M2-M4); 0 otherwise
}

// ----- Group 3: salary-structure levers -----
export interface StructureInputs {
  basicPct: BasicPct;
  hraPct: HraPct;
  npsPct: NpsPct;
  pf: YesNo;
  foodCouponsMonthly: number; // MONTHLY value (e.g. 9600 -> 115200 p.a.)
}

// ----- Group 4: eligibility flags -----
export interface EligibilityInputs {
  isPlant: boolean; // washing allowance only at plant locations
  isMetro: boolean; // metro city -> HRA cap 60% of Basic (else 50%); advisory only
  transport: YesNo; // handicap-only transport allowance, 1600 p.m.
  cea: ChildCount; // Children Education Allowance
  cha: ChildCount; // Children Hostel Allowance
  ber: YesNo; // Business Expense Reimbursement eligible
  lta: YesNo; // LTA reimbursement eligible
}

export interface Inputs {
  candidate: CandidateInputs;
  offer: OfferParamInputs;
  structure: StructureInputs;
  eligibility: EligibilityInputs;
}

// ============================ OUTPUT ========================================

// Stage A — one row per option (1..4). `mpli` holds the variable component
// (MPLI for M5-M11, APB for M2-M4); use OfferResult.band for the label.
export interface OptionResult {
  option: FinalOption;
  incrementPct: number | null; // 0.10/0.15/0.20 for 1-3; null for manual #4
  totalCTC: number;
  mpli: number; // the variable component (MPLI or APB)
  fixed: number;
}

// Stage B — summary for the chosen final option
export interface OfferSummary {
  finalOption: FinalOption;
  currentCTC: number;
  currentFixed: number; // current annual fixed (without gratuity)
  currentVariable: number;
  currentVarRatio: number; // current variable / (CTC or Fixed, per band)
  offerCTC: number; // chosen TotalCTC
  offerFixed: number; // chosen Fixed
  offerMPLI: number; // chosen variable (MPLI or APB)
  offerVarRatio: number; // offer variable / (CTC or Fixed, per band)
  carAllowance: number; // offer car allowance p.a.
  totalRemuneration: number; // offerCTC + carAllowance
  pctIncFixed: number | null;
  pctIncMPLI: number | null;
  pctIncCTC: number | null;
}

// Stage D — one line of the structure table (offer-letter layout)
export type StructureGroup = 'A' | 'B' | 'C' | 'BC' | 'MPLI' | 'TOTAL' | 'EXTRA';

export interface StructureLine {
  key: string;
  label: string;
  annual: number;
  monthly: number; // annual / 12
  remark?: string;
  group: StructureGroup;
  isSubtotal?: boolean;
}

export interface CompStructure {
  lines: StructureLine[];
  totalA: number;
  totalReimbB: number;
  totalRetiralsC: number;
  bPlusC: number;
  totalFixedTarget: number;
  componentFixedSum: number;
  mpli: number; // = offer variable
  grandTotalCTC: number;
  basicAnnual: number;
}

// Stage C — over-and-above benefits (annual unless noted)
export interface OverAndAbove {
  mediclaimAnnual: number;
  groupPersonalAccidentAnnual: number;
  termInsuranceAnnual: number;
  mobileReimb: number; // value as stored for the band
  mobileReimbIsAnnual: boolean; // true: p.a. (M2-M4); false: p.m. (M5-M11)
  gratuityAnnual: number; // basicAnnual * 4.81%
}

// Reconciliation / data-quality flags surfaced in the UI
export interface OfferFlags {
  transportOvershoot: boolean;
  transportOvershootAmount: number;
  negativePersonalAllowance: boolean;
  componentMismatch: boolean;
  basicCapExceeded: boolean;
  hraCapExceeded: boolean;
}

export interface OfferResult {
  band: BandConfig;
  options: OptionResult[];
  summary: OfferSummary;
  structure: CompStructure;
  overAndAbove: OverAndAbove;
  flags: OfferFlags;
}

// ----- Level master (lookup data; injected into the engine) -----
export interface LevelRecord {
  id: LevelId;
  band: BandId;
  berPm: number; // Business Expense Reimbursement, p.m.
  transportPm: number; // handicap transport p.m.
  ltaPm: number; // LTA, p.m.
  variablePct: number; // informational band variable rate
  mbrPm: number; // mobile reimb p.m. (M5-M11 over-and-above)
  mobileReimbPa?: number; // mobile reimb p.a. (M2-M4 over-and-above)
  mhrLabel: string;
  hiPa: number; // Health Insurance / Mediclaim, p.a.
  tlPa: number; // Term Life, p.a.
  vpAmt: number; // VP_Amt (reference)
  gpaPa: number; // Group Personal Accident, p.a.
  ceaPm?: number;
  chaPm?: number;
}

export interface LevelMaster {
  levels: Partial<Record<LevelId, LevelRecord>>;
  mpliBands: Partial<Record<LevelId, number>>; // default variable % per level
  source: 'bundled' | 'user-json';
}
