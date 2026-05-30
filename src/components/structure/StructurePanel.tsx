import { useState, type ReactNode } from 'react';
import type { OfferResult, Inputs } from '../../engine/types';
import type { OfferMeta, Addons } from '../../state/form';
import { ADDON_ROWS, EMPTY_META, offerHeaderPairs } from '../../state/form';
import { formatINR } from '../../format/currency';
import { STRUCTURE_REMARKS } from '../../data/strings';
import { copyOfferToClipboard } from '../../format/clipboard';
import { InfoTooltip } from '../common/InfoTooltip';
import { Button, Eyebrow } from '../common/ui';
import { cn } from '../common/cn';

interface PanelProps {
  result: OfferResult;
  inputs: Inputs;
  tooltips: Record<string, string>;
  paise: boolean;
  /** compact = table + warnings only (no header/export/over-above/add-ons). */
  compact?: boolean;
  meta?: OfferMeta;
  addons?: Addons;
}

function Alert({ tone, children }: { tone: 'red' | 'ember'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded border-l-2 p-2 text-[12px]',
        tone === 'red' ? 'border-red-600 bg-red-50 text-red-800' : 'border-ember bg-surface text-graphite-800',
      )}
    >
      {children}
    </div>
  );
}

function ReconcileWarning({ result, inputs }: { result: OfferResult; inputs: Inputs }) {
  const { flags } = result;
  const items: { tone: 'red' | 'ember'; text: string }[] = [];
  if (flags.negativePersonalAllowance) {
    items.push({
      tone: 'red',
      text: 'Personal Allowance is negative — Basic % and/or HRA % are too high for this CTC. Lower them so the fixed components fit within Total Fixed Salary.',
    });
  }
  if (flags.basicCapExceeded) {
    items.push({ tone: 'ember', text: `Basic is ${inputs.structure.basicPct}% of CTC — above the 15–40% policy cap.` });
  }
  if (flags.hraCapExceeded) {
    const cap = inputs.eligibility.isMetro ? 60 : 50;
    items.push({
      tone: 'ember',
      text: `HRA is ${inputs.structure.hraPct}% of Basic — above the ${cap}% cap for ${inputs.eligibility.isMetro ? 'metro' : 'non-metro'} locations.`,
    });
  }
  if (flags.transportOvershoot) {
    items.push({
      tone: 'ember',
      text: `Transport allowance (${formatINR(flags.transportOvershootAmount)}/yr) is treated as over-and-above, so the component total exceeds Total Fixed Salary by this amount. This matches the source model.`,
    });
  }
  if (flags.componentMismatch) {
    items.push({ tone: 'red', text: 'Components do not tie out to Total Fixed Salary — please review the inputs.' });
  }
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <Alert key={i} tone={it.tone}>{it.text}</Alert>
      ))}
    </div>
  );
}

function MetaHeader({ meta, level, isPlant }: { meta?: OfferMeta; level: string; isPlant: boolean }) {
  const pairs = offerHeaderPairs(meta ?? EMPTY_META, level, isPlant);
  if (pairs.length === 0) return null;
  return (
    <div className="card p-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
        {pairs.map(([k, v]) => (
          <div key={k}>
            <div className="eyebrow">{k}</div>
            <div className="text-[14px] text-ink">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StructureTable({ result, tooltips, paise }: { result: OfferResult; tooltips: Record<string, string>; paise: boolean }) {
  const money = (n: number) => formatINR(n, { paise, symbol: false });
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
          <th className="py-1.5 pr-2 font-semibold">Salary component</th>
          <th className="px-2 text-right font-semibold">Monthly (₹)</th>
          <th className="px-2 text-right font-semibold">Annum (₹)</th>
          <th className="hidden pl-2 font-semibold lg:table-cell">Remarks</th>
        </tr>
      </thead>
      <tbody>
        {result.structure.lines.map((l) => (
          <tr key={l.key} className={cn('border-b border-graphite-100', l.isSubtotal && 'bg-surface font-semibold')}>
            <td className="py-1.5 pr-2">
              <span className="flex items-center">
                {l.label}
                {tooltips[l.key] && <InfoTooltip text={tooltips[l.key]} align="right" />}
              </span>
            </td>
            <td className="tnum px-2 text-right">{money(l.monthly)}</td>
            <td className="tnum px-2 text-right">{money(l.annual)}</td>
            <td className="hidden pl-2 text-[11px] font-normal text-muted lg:table-cell">{STRUCTURE_REMARKS[l.key] ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OverAboveTable({ result, tooltips, paise }: { result: OfferResult; tooltips: Record<string, string>; paise: boolean }) {
  const oa = result.overAndAbove;
  const money = (n: number) => formatINR(n, { paise });
  const rows: { key: string; label: string; value: string; remark: string }[] = [
    { key: 'oa.mediclaim', label: 'Mediclaim', value: `${money(oa.mediclaimAnnual)} p.a.`, remark: 'Self, spouse + first two children' },
    { key: 'oa.gpa', label: 'Group Personal Accident', value: `${money(oa.groupPersonalAccidentAnnual)} p.a.`, remark: 'Self' },
    { key: 'oa.term', label: 'Term Insurance', value: `${money(oa.termInsuranceAnnual)} p.a.`, remark: 'Self' },
    { key: 'oa.mobile', label: 'Mobile Reimbursement', value: `${money(oa.mobileReimbMonthly)} p.m.`, remark: 'Per month' },
    { key: 'oa.gratuity', label: 'Gratuity', value: `${formatINR(oa.gratuityAnnual, { paise: true })} p.a.`, remark: 'After 5 years of service' },
  ];
  return (
    <table className="w-full border-collapse text-[13px]">
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-b border-graphite-100">
            <td className="py-1.5 pr-2">
              <span className="flex items-center">
                {r.label}
                <InfoTooltip text={tooltips[r.key]} align="right" />
              </span>
            </td>
            <td className="tnum px-2 text-right">{r.value}</td>
            <td className="hidden pl-2 text-[11px] text-muted lg:table-cell">{r.remark}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AddonsSummary({ addons, paise }: { addons?: Addons; paise: boolean }) {
  if (!addons) return null;
  const rows = ADDON_ROWS.filter(([k]) => addons[k] > 0);
  if (rows.length === 0) return null;
  return (
    <div className="card p-3">
      <Eyebrow>Bonuses &amp; incentives</Eyebrow>
      <table className="mt-1 w-full border-collapse text-[13px]">
        <tbody>
          {rows.map(([k, label]) => (
            <tr key={k} className="border-b border-graphite-100">
              <td className="py-1.5 pr-2">{label}</td>
              <td className="tnum px-2 text-right">{formatINR(addons[k], { paise })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExportBar({
  result, paise, meta, addons, level, isPlant,
}: {
  result: OfferResult;
  paise: boolean;
  meta?: OfferMeta;
  addons?: Addons;
  level: string;
  isPlant: boolean;
}) {
  const [copied, setCopied] = useState<'' | 'rich' | 'tsv'>('');
  const [err, setErr] = useState(false);
  const copy = async (fmt: 'rich' | 'tsv') => {
    setErr(false);
    try {
      await copyOfferToClipboard(result, fmt, { paise }, { meta, addons, level, isPlant });
      setCopied(fmt);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setErr(true);
    }
  };
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button variant="primary" onClick={() => copy('rich')}>
        {copied === 'rich' ? 'Copied ✓' : 'Copy table'}
      </Button>
      <Button variant="ghost" onClick={() => copy('tsv')}>
        {copied === 'tsv' ? 'Copied ✓' : 'Copy as TSV'}
      </Button>
      <Button variant="ghost" onClick={() => window.print()}>Print / Save PDF</Button>
      {err && <span className="text-[12px] text-red-700">Copy failed — try the TSV button.</span>}
    </div>
  );
}

export function StructurePanel({ result, inputs, tooltips, paise, compact = false, meta, addons }: PanelProps) {
  return (
    <section className="flex flex-col gap-4">
      {!compact && <MetaHeader meta={meta} level={inputs.offer.level} isPlant={inputs.eligibility.isPlant} />}

      {!compact && (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <Eyebrow>Compensation structure</Eyebrow>
            <h2 className="text-h3 text-ink">{inputs.offer.level} · offer-letter breakup</h2>
          </div>
          <ExportBar result={result} paise={paise} meta={meta} addons={addons} level={inputs.offer.level} isPlant={inputs.eligibility.isPlant} />
        </div>
      )}

      <ReconcileWarning result={result} inputs={inputs} />

      <div className="card p-3">
        <StructureTable result={result} tooltips={tooltips} paise={paise} />
      </div>

      {!compact && (
        <>
          <div className="card p-3">
            <Eyebrow>Over &amp; above</Eyebrow>
            <div className="mt-1">
              <OverAboveTable result={result} tooltips={tooltips} paise={paise} />
            </div>
          </div>
          <AddonsSummary addons={addons} paise={paise} />
        </>
      )}
    </section>
  );
}
