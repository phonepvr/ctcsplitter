import type { OfferResult } from '../engine/types';
import type { OfferMeta, Addons } from '../state/form';
import { ADDON_ROWS, EMPTY_META, offerHeaderPairs } from '../state/form';
import { formatINR } from './currency';
import { STRUCTURE_REMARKS } from '../data/strings';

export interface ClipboardOpts {
  paise?: boolean;
}

export interface OfferExtras {
  meta?: OfferMeta;
  addons?: Addons;
  level?: string;
  isPlant?: boolean;
}

interface Row {
  cells: string[];
  bold?: boolean;
  span?: boolean; // section divider — spans the full table width
}

function headerPairs(extras: OfferExtras): [string, string][] {
  if (!extras.meta && !extras.level) return [];
  return offerHeaderPairs(extras.meta ?? EMPTY_META, extras.level ?? '', !!extras.isPlant);
}

// The 4-column structure body (structure lines + over-and-above + add-ons).
// The offer-details header is rendered separately as a 2-column table.
function bodyRows(result: OfferResult, opts: ClipboardOpts, extras: OfferExtras): Row[] {
  const fmt = (n: number) => formatINR(n, { paise: opts.paise, symbol: false });
  const out: Row[] = [];

  out.push({ cells: ['Salary Component', 'Monthly (₹)', 'Annum (₹)', 'Remarks'], bold: true });
  for (const l of result.structure.lines) {
    out.push({ cells: [l.label, fmt(l.monthly), fmt(l.annual), STRUCTURE_REMARKS[l.key] ?? ''], bold: l.isSubtotal });
  }

  const oa = result.overAndAbove;
  out.push({ cells: ['Over & above (p.a.)'], bold: true, span: true });
  out.push({ cells: ['Mediclaim', '', fmt(oa.mediclaimAnnual), 'Self, spouse + first two children'] });
  out.push({ cells: ['Group Personal Accident', '', fmt(oa.groupPersonalAccidentAnnual), 'Self'] });
  out.push({ cells: ['Term Insurance', '', fmt(oa.termInsuranceAnnual), 'Self'] });
  out.push({
    cells: [
      'Mobile Reimbursement',
      oa.mobileReimbIsAnnual ? '' : fmt(oa.mobileReimb),
      oa.mobileReimbIsAnnual ? fmt(oa.mobileReimb) : '',
      oa.mobileReimbIsAnnual ? 'Per year' : 'Per month',
    ],
  });
  out.push({ cells: ['Gratuity', '', fmt(oa.gratuityAnnual), '4.81% of annual Basic'] });

  if (extras.addons) {
    const addons = extras.addons;
    const nonZero = ADDON_ROWS.filter(([k]) => addons[k] > 0);
    if (nonZero.length > 0) {
      out.push({ cells: ['Bonuses & incentives'], bold: true, span: true });
      for (const [k, label] of nonZero) out.push({ cells: [label, '', fmt(addons[k]), ''] });
    }
  }
  return out;
}

/** Tab-separated representation — pastes cleanly into Excel or a plain editor. */
export function buildStructureTSV(result: OfferResult, opts: ClipboardOpts = {}, extras: OfferExtras = {}): string {
  const pairs = headerPairs(extras);
  const lines: string[] = [];
  if (pairs.length > 0) {
    lines.push('Offer details');
    for (const [k, v] of pairs) lines.push(`${k}\t${v}`);
    lines.push('');
  }
  for (const r of bodyRows(result, opts, extras)) {
    lines.push(r.span ? r.cells[0] : r.cells.join('\t'));
  }
  return lines.join('\n');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CELL = 'border:1px solid #D6DAE2;padding:4px 8px;';
const TABLE = 'border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;color:#0E1219;';

/** Minimal-styled HTML — a 2-col offer-details table + the 4-col structure table. */
export function buildStructureHTML(result: OfferResult, opts: ClipboardOpts = {}, extras: OfferExtras = {}): string {
  let html = '';

  const pairs = headerPairs(extras);
  if (pairs.length > 0) {
    const title = `<tr><th colspan="2" style="${CELL}text-align:left;background:#F6F7F9;font-weight:600">Offer details</th></tr>`;
    const rows = pairs
      .map(
        ([k, v]) =>
          `<tr><th style="${CELL}text-align:left;background:#F6F7F9;font-weight:600;width:170px">${esc(k)}</th>` +
          `<td style="${CELL}text-align:left">${esc(v)}</td></tr>`,
      )
      .join('');
    html += `<table style="${TABLE}margin-bottom:12px">${title}${rows}</table>`;
  }

  const body = bodyRows(result, opts, extras)
    .map((r) => {
      if (r.span) {
        return `<tr><th colspan="4" style="${CELL}text-align:left;background:#F6F7F9;font-weight:600">${esc(r.cells[0])}</th></tr>`;
      }
      const tag = r.bold ? 'th' : 'td';
      const weight = r.bold ? 'font-weight:600;background:#F6F7F9;' : '';
      const cells = r.cells
        .map((c, idx) => {
          const align = idx === 0 || idx === 3 ? 'left' : 'right';
          return `<${tag} style="${CELL}text-align:${align};${weight}">${esc(c)}</${tag}>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  html += `<table style="${TABLE}">${body}</table>`;
  return html;
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
