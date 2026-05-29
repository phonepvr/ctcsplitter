import type { OfferResult } from '../engine/types';
import { formatINR } from './currency';
import { STRUCTURE_REMARKS } from '../data/strings';

export interface ClipboardOpts {
  paise?: boolean;
}

interface Row {
  cells: string[];
  bold?: boolean;
}

function structureRows(result: OfferResult, opts: ClipboardOpts): Row[] {
  const fmt = (n: number) => formatINR(n, { paise: opts.paise, symbol: false });
  const rows: Row[] = [{ cells: ['Salary Component', 'Monthly (₹)', 'Annum (₹)', 'Remarks'], bold: true }];
  for (const l of result.structure.lines) {
    rows.push({
      cells: [l.label, fmt(l.monthly), fmt(l.annual), STRUCTURE_REMARKS[l.key] ?? ''],
      bold: l.isSubtotal,
    });
  }
  const oa = result.overAndAbove;
  rows.push({ cells: ['Over & above (p.a.)', '', '', ''], bold: true });
  rows.push({ cells: ['Mediclaim', '', fmt(oa.mediclaimAnnual), 'Self, spouse + first two children'] });
  rows.push({ cells: ['Group Personal Accident', '', fmt(oa.groupPersonalAccidentAnnual), 'Self'] });
  rows.push({ cells: ['Term Insurance', '', fmt(oa.termInsuranceAnnual), 'Self'] });
  rows.push({ cells: ['Mobile Reimbursement', fmt(oa.mobileReimbMonthly), '', 'Per month'] });
  rows.push({ cells: ['Gratuity', '', fmt(oa.gratuityAnnual), '4.81% of annual Basic'] });
  return rows;
}

/** Tab-separated representation — pastes cleanly into Excel or a plain editor. */
export function buildStructureTSV(result: OfferResult, opts: ClipboardOpts = {}): string {
  return structureRows(result, opts)
    .map((r) => r.cells.join('\t'))
    .join('\n');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Minimal-styled HTML table — pastes as a real table into Word / Outlook. */
export function buildStructureHTML(result: OfferResult, opts: ClipboardOpts = {}): string {
  const rows = structureRows(result, opts);
  const body = rows
    .map((r) => {
      const tag = r.bold ? 'th' : 'td';
      const weight = r.bold ? 'font-weight:600;background:#F6F7F9;' : '';
      const cells = r.cells
        .map((c, idx) => {
          const align = idx === 0 || idx === 3 ? 'left' : 'right';
          return `<${tag} style="border:1px solid #D6DAE2;padding:4px 8px;text-align:${align};${weight}">${esc(c)}</${tag}>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;color:#0E1219">${body}</table>`;
}

async function writeText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Legacy fallback (still entirely local — no network).
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

/** Copy the structure table to the clipboard as rich HTML (+plain TSV) or plain TSV. */
export async function copyOfferToClipboard(
  result: OfferResult,
  fmt: 'rich' | 'tsv',
  opts: ClipboardOpts = {},
): Promise<void> {
  const tsv = buildStructureTSV(result, opts);
  if (fmt === 'tsv') {
    await writeText(tsv);
    return;
  }
  const html = buildStructureHTML(result, opts);
  if (
    typeof ClipboardItem !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function'
  ) {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([tsv], { type: 'text/plain' }),
    });
    await navigator.clipboard.write([item]);
  } else {
    await writeText(tsv);
  }
}
