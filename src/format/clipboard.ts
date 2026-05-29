import type { OfferResult } from '../engine/types';
import type { OfferMeta, Addons } from '../state/form';
import { ADDON_ROWS } from '../state/form';
import { formatINR } from './currency';
import { STRUCTURE_REMARKS } from '../data/strings';

export interface ClipboardOpts {
  paise?: boolean;
}

export interface OfferExtras {
  meta?: OfferMeta;
  addons?: Addons;
}

interface Row {
  cells: string[];
  bold?: boolean;
}

function hasMeta(meta?: OfferMeta): meta is OfferMeta {
  return !!meta && !!(meta.name || meta.position || meta.location || meta.date);
}

function rows(result: OfferResult, opts: ClipboardOpts, extras: OfferExtras): Row[] {
  const fmt = (n: number) => formatINR(n, { paise: opts.paise, symbol: false });
  const out: Row[] = [];

  if (hasMeta(extras.meta)) {
    const m = extras.meta;
    out.push({ cells: ['Offer details', '', '', ''], bold: true });
    if (m.name) out.push({ cells: ['Name', m.name, '', ''] });
    if (m.position) out.push({ cells: ['Position', m.position, '', ''] });
    if (m.location) out.push({ cells: ['Location', m.location, '', ''] });
    if (m.date) out.push({ cells: ['Date', m.date, '', ''] });
  }

  out.push({ cells: ['Salary Component', 'Monthly (₹)', 'Annum (₹)', 'Remarks'], bold: true });
  for (const l of result.structure.lines) {
    out.push({ cells: [l.label, fmt(l.monthly), fmt(l.annual), STRUCTURE_REMARKS[l.key] ?? ''], bold: l.isSubtotal });
  }

  const oa = result.overAndAbove;
  out.push({ cells: ['Over & above (p.a.)', '', '', ''], bold: true });
  out.push({ cells: ['Mediclaim', '', fmt(oa.mediclaimAnnual), 'Self, spouse + first two children'] });
  out.push({ cells: ['Group Personal Accident', '', fmt(oa.groupPersonalAccidentAnnual), 'Self'] });
  out.push({ cells: ['Term Insurance', '', fmt(oa.termInsuranceAnnual), 'Self'] });
  out.push({ cells: ['Mobile Reimbursement', fmt(oa.mobileReimbMonthly), '', 'Per month'] });
  out.push({ cells: ['Gratuity', '', fmt(oa.gratuityAnnual), '4.81% of annual Basic'] });

  if (extras.addons) {
    const addons = extras.addons;
    const nonZero = ADDON_ROWS.filter(([k]) => addons[k] > 0);
    if (nonZero.length > 0) {
      out.push({ cells: ['Bonuses & incentives', '', '', ''], bold: true });
      for (const [k, label] of nonZero) {
        out.push({ cells: [label, '', fmt(addons[k]), ''] });
      }
    }
  }
  return out;
}

/** Tab-separated representation — pastes cleanly into Excel or a plain editor. */
export function buildStructureTSV(result: OfferResult, opts: ClipboardOpts = {}, extras: OfferExtras = {}): string {
  return rows(result, opts, extras)
    .map((r) => r.cells.join('\t'))
    .join('\n');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Minimal-styled HTML table — pastes as a real table into Word / Outlook. */
export function buildStructureHTML(result: OfferResult, opts: ClipboardOpts = {}, extras: OfferExtras = {}): string {
  const body = rows(result, opts, extras)
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

/** Copy the structure (+ optional header/add-ons) to the clipboard. */
export async function copyOfferToClipboard(
  result: OfferResult,
  fmt: 'rich' | 'tsv',
  opts: ClipboardOpts = {},
  extras: OfferExtras = {},
): Promise<void> {
  const tsv = buildStructureTSV(result, opts, extras);
  if (fmt === 'tsv') {
    await writeText(tsv);
    return;
  }
  const html = buildStructureHTML(result, opts, extras);
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
