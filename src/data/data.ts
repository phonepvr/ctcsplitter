import type {
  Inputs, LevelId, BasicPct, HraPct, MpliPct, NpsPct, ChildCount, FinalOption,
} from '../engine/types';

// NON-confidential reference data: dropdown option lists, defaults and pure
// helpers. Safe to ship in the public bundle. (Level-keyed comp amounts live in
// the injected LevelMaster, NOT here.)

export const LEVEL_OPTIONS: LevelId[] = ['M-5', 'M-6', 'M-7', 'M-8', 'M-9', 'M-10', 'M-11'];
export const MPLI_OPTIONS: MpliPct[] = [12, 15, 20];
export const NPS_OPTIONS: NpsPct[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const BASIC_OPTIONS: BasicPct[] = [30, 35, 40, 45, 50];
export const HRA_OPTIONS: HraPct[] = [0, 30, 40, 50, 60];
export const FINAL_OPTIONS: FinalOption[] = [1, 2, 3, 4];

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
  npsPct: 0 as NpsPct,
  pf: 'Y' as const,
  foodCouponsMonthly: 9600,
  manualOption4CTC: 15_000_000,
  mpliFallback: 12 as MpliPct,
};

/** Case-insensitive normaliser for child-count labels (Excel used mixed case). */
export function normalizeChildCount(raw: string): ChildCount {
  const s = raw.trim().toLowerCase();
  if (s === 'y for 1 child' || s === 'one' || s === '1') return 'ONE';
  if (s === 'y for 2 children' || s === 'two' || s === '2') return 'TWO';
  return 'NONE';
}

/** Initial Inputs for the UI (and a convenient test base). */
export function buildDefaultInputs(level: LevelId, mpliPct: MpliPct): Inputs {
  return {
    candidate: { currentAnnualFixedWithoutGratuity: 0, currentAnnualVariable: 0 },
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
