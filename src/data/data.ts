import type {
  Inputs, LevelId, BasicPct, HraPct, MpliPct, NpsPct, ChildCount, FinalOption,
} from '../engine/types';

// NON-confidential reference data: dropdown option lists, defaults and pure
// helpers. Safe to ship in the public bundle. (Level-keyed comp amounts live in
// the injected LevelMaster, NOT here.)

export const LEVEL_OPTIONS: LevelId[] = ['M-2', 'M-3', 'M-4', 'M-5', 'M-6', 'M-7', 'M-8', 'M-9', 'M-10', 'M-11'];
export const MPLI_OPTIONS: MpliPct[] = [12, 15, 20];
export const BASIC_OPTIONS: BasicPct[] = [30, 35, 40, 45, 50];
export const HRA_OPTIONS: HraPct[] = [0, 30, 40, 50, 60];
export const FINAL_OPTIONS: FinalOption[] = [1, 2, 3, 4];

/** NPS % options 0..max (max is band-dependent: 10 for M5-M11, 14 for M2-M4). */
export function npsOptions(max: number): NpsPct[] {
  return Array.from({ length: max + 1 }, (_, i) => i);
}

export const CHILD_OPTIONS: { value: ChildCount; label: string }[] = [
  { value: 'NONE', label: 'No' },
  { value: 'ONE', label: 'Yes — 1 child' },
  { value: 'TWO', label: 'Yes — 2 children' },
];

export const YESNO_OPTIONS: { value: 'Y' | 'N'; label: string }[] = [
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
];

export const DEFAULTS = {
  basicPct: 40 as BasicPct,
  hraPct: 40 as HraPct,
  npsPct: 0,
  pf: 'Y' as const,
  foodCouponsMonthly: 9600,
  manualOption4Mode: 'amount' as const,
  manualOption4CTC: 15_000_000,
  manualOption4Pct: 15,
  carAllowance: 0,
  variableFallback: 12,
};

/** Case-insensitive normaliser for child-count labels (Excel used mixed case). */
export function normalizeChildCount(raw: string): ChildCount {
  const s = raw.trim().toLowerCase();
  if (s === 'y for 1 child' || s === 'one' || s === '1') return 'ONE';
  if (s === 'y for 2 children' || s === 'two' || s === '2') return 'TWO';
  return 'NONE';
}

/** Initial Inputs for the UI (and a convenient test base). */
export function buildDefaultInputs(level: LevelId, variablePct: number): Inputs {
  return {
    candidate: { currentAnnualFixedWithoutGratuity: 0, currentAnnualVariable: 0 },
    offer: {
      level, variablePct, finalOption: 2,
      manualOption4Mode: DEFAULTS.manualOption4Mode,
      manualOption4CTC: DEFAULTS.manualOption4CTC,
      manualOption4Pct: DEFAULTS.manualOption4Pct,
      carAllowance: 0,
    },
    structure: {
      basicPct: DEFAULTS.basicPct,
      hraPct: DEFAULTS.hraPct,
      npsPct: DEFAULTS.npsPct,
      pf: DEFAULTS.pf,
      foodCouponsMonthly: DEFAULTS.foodCouponsMonthly,
    },
    eligibility: { isPlant: false, isMetro: false, transport: 'N', cea: 'NONE', cha: 'NONE', ber: 'N', lta: 'N' },
  };
}
