import type { ChildCount } from './types';

// Universal (non level-specific) policy constants. These are NOT confidential —
// the same figures appear verbatim in offer-letter remarks. The confidential,
// level-keyed amounts live in the injected LevelMaster, never here.

export const MONEY_ROUND = 1000; // MROUND step for CTC / MPLI
export const INCREMENTS = [0.1, 0.15, 0.2] as const; // offer options 1, 2, 3

export const PF_RATE = 0.12; // employer PF = 12% of annual Basic
export const GRATUITY_RATE = 0.0481; // statutory gratuity provision
export const TRANSPORT_ALLOWANCE_PM = 1600; // handicap-only transport allowance
export const WASHING_ALLOWANCE_PM = 1000; // plant-location uniform maintenance

// Caps used for validation warnings only (not enforced in the math).
export const BASIC_PCT_CAP = 40; // remark: Basic capped 15–40% of CTC
export const HRA_METRO_CAP = 0.6; // of Basic
export const HRA_NONMETRO_CAP = 0.5; // of Basic

export const CEA_PM: Record<ChildCount, number> = { NONE: 0, ONE: 3000, TWO: 6000 };
export const CHA_PM: Record<ChildCount, number> = { NONE: 0, ONE: 9000, TWO: 18000 };
