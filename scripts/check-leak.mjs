#!/usr/bin/env node
// Confidentiality guardrail: fail if any value that exists ONLY in the
// confidential level master (src/data/levelMaster.ts) appears in the built
// bundle. Run after `vite build`. Part of the "GH Pages + local data file"
// hosting model — the production bundle must never carry the source tables.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

// Distinctive amounts that occur only in the confidential tables. (15000000 is
// deliberately excluded — it is also the legitimate option-4 default CTC.)
const SENTINELS = ['58333', '43750', '7500000'];

if (!existsSync(DIST)) {
  console.error(`check-leak: "${DIST}/" not found — run \`npm run build\` first.`);
  process.exit(1);
}

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(js|mjs|cjs|html|css|json|map)$/.test(entry.name)) files.push(p);
  }
};
walk(DIST);

let leaked = false;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const s of SENTINELS) {
    if (text.includes(s)) {
      console.error(`check-leak: LEAK — confidential sentinel "${s}" found in ${file}`);
      leaked = true;
    }
  }
}

if (leaked) {
  console.error('check-leak: confidential data leaked into the production bundle. Build rejected.');
  process.exit(1);
}
console.log(`check-leak: OK — scanned ${files.length} files, no confidential sentinels in ${DIST}/.`);
