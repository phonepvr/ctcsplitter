import type { LevelId, LevelRecord, LevelMaster, MpliPct } from '../engine/types';

// ============================================================================
// ⚠️  CONFIDENTIAL — internal compensation policy (M-5 .. M-11).
//
// This module is imported ONLY by:
//   (1) unit tests (not shipped), and
//   (2) the dev-only sample loader in App.tsx, behind `import.meta.env.DEV`.
//
// It is NEVER statically referenced from the production entry path, so it is
// tree-shaken out of the deployed bundle. `npm run check-leak` proves that no
// value from this file appears in dist/. In production the HRBP loads these
// tables from a local JSON instead (see dataProvider / dataSchema).
//
// Values transcribed verbatim from the "Source M5 to M11" sheet, rows 16–27.
// ltaPm for M-7 and M-9 are stored as exact fractions so ×12 yields whole LTA.
// ============================================================================

export const MPLI_BANDS: Record<LevelId, MpliPct> = {
  'M-5': 20,
  'M-6': 20,
  'M-7': 20,
  'M-8': 15,
  'M-9': 12,
  'M-10': 12,
  'M-11': 12,
};

export const LEVEL_RECORDS: Record<LevelId, LevelRecord> = {
  'M-5': { id: 'M-5', berPm: 35000, transportPm: 1600, ltaPm: 3750, variablePct: 0.2, mbrPm: 600, mhrLabel: 'Smartphone', hiPa: 800000, tlPa: 15000000, vpAmt: 58333.33, gpaPa: 15000000 },
  'M-6': { id: 'M-6', berPm: 35000, transportPm: 1600, ltaPm: 2500, variablePct: 0.2, mbrPm: 600, mhrLabel: 'Smartphone', hiPa: 600000, tlPa: 7500000, vpAmt: 58333.33, gpaPa: 10000000 },
  'M-7': { id: 'M-7', berPm: 25000, transportPm: 1600, ltaPm: 5000 / 3, variablePct: 0.2, mbrPm: 600, mhrLabel: 'Smartphone', hiPa: 600000, tlPa: 7500000, vpAmt: 58333.33, gpaPa: 10000000 },
  'M-8': { id: 'M-8', berPm: 20000, transportPm: 1600, ltaPm: 1250, variablePct: 0.15, mbrPm: 425, mhrLabel: '3000', hiPa: 450000, tlPa: 5000000, vpAmt: 43750, gpaPa: 5000000 },
  'M-9': { id: 'M-9', berPm: 15000, transportPm: 1600, ltaPm: 2500 / 3, variablePct: 0.12, mbrPm: 425, mhrLabel: '3000', hiPa: 450000, tlPa: 5000000, vpAmt: 35000, gpaPa: 5000000 },
  'M-10': { id: 'M-10', berPm: 12000, transportPm: 1600, ltaPm: 625, variablePct: 0.12, mbrPm: 425, mhrLabel: '3000', hiPa: 450000, tlPa: 2500000, vpAmt: 35000, gpaPa: 5000000 },
  'M-11': { id: 'M-11', berPm: 12000, transportPm: 1600, ltaPm: 625, variablePct: 0.12, mbrPm: 425, mhrLabel: '3000', hiPa: 450000, tlPa: 2500000, vpAmt: 35000, gpaPa: 5000000 },
};

export const bundledMaster: LevelMaster = {
  levels: LEVEL_RECORDS,
  mpliBands: MPLI_BANDS,
  source: 'bundled',
};
