import type { LevelId, LevelRecord, LevelMaster, MpliPct } from '../engine/types';
import { LEVEL_OPTIONS, MPLI_OPTIONS } from './data';

export class DataValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataValidationError';
  }
}

const NUMERIC_FIELDS: (keyof LevelRecord)[] = [
  'berPm', 'transportPm', 'ltaPm', 'variablePct', 'mbrPm', 'hiPa', 'tlPa', 'vpAmt', 'gpaPa',
];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validateRecord(id: LevelId, raw: unknown): LevelRecord {
  if (!isObject(raw)) throw new DataValidationError(`Level ${id}: expected an object.`);
  for (const f of NUMERIC_FIELDS) {
    if (typeof raw[f] !== 'number' || !Number.isFinite(raw[f])) {
      throw new DataValidationError(`Level ${id}: field "${String(f)}" must be a finite number.`);
    }
  }
  if (typeof raw.mhrLabel !== 'string') {
    throw new DataValidationError(`Level ${id}: field "mhrLabel" must be a string.`);
  }
  return { id, ...(raw as object) } as LevelRecord;
}

/**
 * Validate a user-supplied JSON object into a typed LevelMaster.
 * Expected shape: { levels: { "M-5": {...}, ... }, mpliBands: { "M-5": 20, ... } }.
 * Throws DataValidationError with a human-readable message on any problem.
 */
export function validateLevelMaster(raw: unknown): LevelMaster {
  if (!isObject(raw)) throw new DataValidationError('Root must be a JSON object.');
  if (!isObject(raw.levels)) throw new DataValidationError('Missing "levels" object.');
  const bandsRaw = isObject(raw.mpliBands) ? raw.mpliBands : {};

  const levels: Partial<Record<LevelId, LevelRecord>> = {};
  const mpliBands: Partial<Record<LevelId, MpliPct>> = {};

  for (const id of LEVEL_OPTIONS) {
    const recRaw = (raw.levels as Record<string, unknown>)[id];
    if (recRaw === undefined) continue; // partial masters allowed (warns in UI)
    levels[id] = validateRecord(id, recRaw);

    const band = (bandsRaw as Record<string, unknown>)[id];
    if (band !== undefined) {
      if (!MPLI_OPTIONS.includes(band as MpliPct)) {
        throw new DataValidationError(`mpliBands.${id} must be one of ${MPLI_OPTIONS.join('/')}.`);
      }
      mpliBands[id] = band as MpliPct;
    }
  }

  if (Object.keys(levels).length === 0) {
    throw new DataValidationError('No recognised levels (M-5 … M-11) found in "levels".');
  }
  return { levels, mpliBands, source: 'user-json' };
}
