import type { LevelMaster } from '../engine/types';
import { validateLevelMaster } from './dataSchema';

// Abstraction over WHERE the (confidential) level master comes from. The engine
// only ever receives a resolved LevelMaster, so it is agnostic to the source.
//
// Production ships with NO bundled tables (see hosting decision): the app starts
// from `emptyMaster` and the HRBP loads a local JSON, which is validated here.
// The bundled sample (levelMaster.ts) is loaded only in dev, via an
// `import.meta.env.DEV`-guarded dynamic import in App.tsx — so it is tree-shaken
// out of the production build.

export const emptyMaster: LevelMaster = {
  levels: {},
  mpliBands: {},
  source: 'user-json',
};

/** True when at least one level record is available to compute with. */
export function hasData(master: LevelMaster): boolean {
  return Object.keys(master.levels).length > 0;
}

/** Parse + validate the contents of a user-supplied JSON file into a LevelMaster. */
export function parseUserJson(text: string): LevelMaster {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  return validateLevelMaster(json);
}
