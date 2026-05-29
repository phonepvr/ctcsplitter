// ============================================================================
// Core types for the CTC offer engine.
// The engine is pure: computeOffer(Inputs, LevelMaster) -> OfferResult.
// All money values are in INR. "annual" unless a field name says monthly/pm.
// ============================================================================

// ----- Enumerations / option unions -----
// v1 scope is M-5..M-11. M-1..M-4 use a different structure and can be added
// later by extending this union + adding LevelRecords (see data layer).
export type LevelId = 'M-5' | 'M-6' | 'M-7' | 'M-8' | 'M-9' | 'M-10' | 'M-11';

export type YesNo = 'Y' | 'N';

export type BasicPct = 30 | 35 | 40 | 45 | 50;
export type HraPct = 0 | 30 | 40 | 50 | 60;
export type MpliPct = 12 | 15 | 20;
export type NpsPct = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// Children Education / Hostel allowance selection. Source labels are
// case-insensitive ("Y for 1 Child" / "Y for 2 Children"); normalised here.
export type ChildCount = 'NONE' | 'ONE' | 'TWO';

export type FinalOption = 1 | 2 | 3 | 4;

// ----- Group 1: candidate current compensation -----
// The UI captures itemised monthly lines; only these two derived annual totals
// reach the engine. (currentCTC is derived, not entered.)
export interface CandidateInputs {
  currentAnnualFixedWithoutGratuity: number;
  currentAnnualVariable: number;
}

// ----- Group 2: level & offer parameters -----
export interface OfferParamInputs {
  level: LevelId;
  mpliPct: MpliPct; // defaults to the band value for the level
  finalOption: FinalOption; // 1|2|3 = +10/15/20%, 4 = manual absolute CTC
  manualOption4CTC: number; // used only when finalOption === 4
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

// Stage A — one row per option (1..4)
export interface OptionResult {
  option: FinalOption;
  incrementPct: number | null; // 0.10/0.15/0.20 for 1-3; null for manual #4
  totalCTC: number; // mround(currentCTC*(1+inc),1000) or the manual amount
  mpli: number; // mround(totalCTC * mpli%, 1000)
  fixed: number; // totalCTC - mpli
}

// Stage B — summary for the chosen final option
export interface OfferSummary {
  finalOption: FinalOption;
  currentCTC: number;
  currentFixed: number; // current annual fixed (without gratuity)
  currentVariable: number;
  currentVarToTotal: number; // currentVariable / currentCTC
  offerCTC: number; // chosen TotalCTC
  offerFixed: number; // chosen Fixed
  offerMPLI: number; // chosen MPLI
  offerVarToTotal: number; // offerMPLI / offerCTC
  pctIncFixed: number | null; // offerFixed/currentFixed - 1 (null if current 0)
  pctIncMPLI: number | null; // offerMPLI/currentVariable - 1 (null if current 0)
  pctIncCTC: number | null; // offerCTC/currentCTC - 1 (null if current 0)
}

// Stage D — one line of the structure table (offer-letter layout)
export type StructureGroup = 'A' | 'B' | 'C' | 'BC' | 'MPLI' | 'TOTAL';

export interface StructureLine {
  key: string; // stable id, e.g. 'basic','hra','personalAllowance'
  label: string;
  annual: number;
  monthly: number; // annual / 12
  remark?: string;
  group: StructureGroup;
  isSubtotal?: boolean; // Total A / Total Reimb B / Total Retirals C / B+C
}

export interface CompStructure {
  lines: StructureLine[]; // in exact Excel row order
  totalA: number; // sum of rows 1-8 (includes transport)
  totalReimbB: number; // BER + LTA
  totalRetiralsC: number; // PF + NPS
  bPlusC: number;
  totalFixedTarget: number; // = offerFixed (the plug forces A(excl transport)+B+C to this)
  componentFixedSum: number; // actual sum A + B + C (overshoots by transport when Y)
  mpli: number; // = offerMPLI
  grandTotalCTC: number; // totalFixedTarget + mpli = offerCTC
  basicAnnual: number; // exposed for gratuity / convenience
}

// Stage C — over-and-above benefits (annual unless noted)
export interface OverAndAbove {
  mediclaimAnnual: number; // HI
  groupPersonalAccidentAnnual: number; // GPA
  termInsuranceAnnual: number; // TL
  mobileReimbMonthly: number; // MBR (per month)
  gratuityAnnual: number; // basicAnnual * 4.81%
}

// Reconciliation / data-quality flags surfaced in the UI
export interface OfferFlags {
  transportOvershoot: boolean; // transport=Y -> component sum exceeds target
  transportOvershootAmount: number; // annual transport in the overshoot (e.g. 19200)
  negativePersonalAllowance: boolean; // plug < 0 (Basic%/HRA% too high for CTC)
  componentMismatch: boolean; // residual mismatch beyond the known transport quirk
  basicCapExceeded: boolean; // Basic% above the 40% policy cap
  hraCapExceeded: boolean; // HRA% above the metro (60%) / non-metro (50%) cap
}

export interface OfferResult {
  options: OptionResult[]; // length 4
  summary: OfferSummary;
  structure: CompStructure;
  overAndAbove: OverAndAbove;
  flags: OfferFlags;
}

// ----- Level master (lookup data; injected into the engine) -----
export interface LevelRecord {
  id: LevelId;
  berPm: number; // Business Expense Reimbursement, p.m.
  transportPm: number; // handicap transport p.m. (1600; 0 for future M-1/M-2)
  ltaPm: number; // LTA, p.m.
  variablePct: number; // informational (matches MPLI band)
  mbrPm: number; // mobile bill reimbursement, p.m. (used by over-and-above)
  mhrLabel: string; // mobile handset: "Smartphone" | "3000" (display only)
  hiPa: number; // Health Insurance / Mediclaim, p.a.
  tlPa: number; // Term Life, p.a.
  vpAmt: number; // VP_Amt (reference)
  gpaPa: number; // Group Personal Accident, p.a.
  // Future M-1..M-4 carry CEA/CHA in the source table; undefined for M-5..M-11.
  ceaPm?: number;
  chaPm?: number;
}

export interface LevelMaster {
  levels: Partial<Record<LevelId, LevelRecord>>;
  mpliBands: Partial<Record<LevelId, MpliPct>>;
  source: 'bundled' | 'user-json';
}
