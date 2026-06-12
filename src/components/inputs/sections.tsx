import type { Dispatch, SetStateAction } from 'react';
import type {
  LevelId, BasicPct, HraPct, YesNo, ChildCount, FinalOption, LevelMaster,
} from '../../engine/types';
import { defaultMpliForLevel, bandForLevel } from '../../engine/engine';
import {
  LEVEL_OPTIONS, BASIC_OPTIONS, HRA_OPTIONS, CHILD_OPTIONS, npsOptions,
} from '../../data/data';
import { INPUT_COPY } from '../../data/strings';
import { formatINR } from '../../format/currency';
import {
  type FormState, type CandidateItemized, type OfferMeta, type Addons, deriveCandidate,
} from '../../state/form';
import { NumberField, SelectField, ToggleField, TextField, ReadoutRow } from './fields';

type SetForm = Dispatch<SetStateAction<FormState>>;

interface SectionProps {
  form: FormState;
  setForm: SetForm;
  master: LevelMaster;
}

const FLEX_FIELDS: { key: keyof CandidateItemized; label: string }[] = [
  { key: 'educationOfficeWear', label: 'Education / Office Wear' },
  { key: 'broadbandFoodGift', label: 'Broadband / Food Coupon / Gift Vouchers' },
  { key: 'hra', label: 'HRA' },
  { key: 'residualChoicePay', label: 'Residual Choice Pay' },
  { key: 'additionalHra', label: 'Additional HRA' },
  { key: 'fuelMaintenance', label: 'Fuel & Maintenance / Add. incentive' },
  { key: 'lta', label: 'LTA' },
];

const RETIRAL_FIELDS: { key: keyof CandidateItemized; label: string }[] = [
  { key: 'pf', label: 'Provident Fund (employer)' },
  { key: 'nps', label: 'National Pension Scheme' },
  { key: 'superannuation', label: 'Superannuation' },
  { key: 'gratuity', label: 'Gratuity' },
];

const numOpts = (vals: readonly number[]) => vals.map((v) => ({ value: v, label: `${v}%` }));

const patchers = (setForm: SetForm) => ({
  candidate: (patch: Partial<CandidateItemized>) =>
    setForm((f) => ({ ...f, candidate: { ...f.candidate, ...patch } })),
  offer: (patch: Partial<FormState['offer']>) =>
    setForm((f) => ({ ...f, offer: { ...f.offer, ...patch } })),
  structure: (patch: Partial<FormState['structure']>) =>
    setForm((f) => ({ ...f, structure: { ...f.structure, ...patch } })),
  eligibility: (patch: Partial<FormState['eligibility']>) =>
    setForm((f) => ({ ...f, eligibility: { ...f.eligibility, ...patch } })),
  meta: (patch: Partial<OfferMeta>) =>
    setForm((f) => ({ ...f, meta: { ...f.meta, ...patch } })),
  addons: (patch: Partial<Addons>) =>
    setForm((f) => ({ ...f, addons: { ...f.addons, ...patch } })),
});

export function CandidateSection({ form, setForm }: Omit<SectionProps, 'master'>) {
  const set = patchers(setForm).candidate;
  const c = form.candidate;
  const mode = form.entryMode;
  const d = deriveCandidate(c, mode);
  const fmt = (n: number) => formatINR(n, { symbol: true });
  const suffix = mode === 'annual' ? '/yr' : '/mo';
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="flex flex-col gap-3 lg:col-span-7">
        <ToggleField<'monthly' | 'annual'>
          label="Amounts entered as"
          tooltip="Choose how you are typing the candidate's current components. Annual amounts are divided by 12 internally; totals always show both."
          value={mode}
          options={[{ value: 'annual', label: 'Annual' }, { value: 'monthly', label: 'Monthly' }]}
          onChange={(v) => setForm((f) => ({ ...f, entryMode: v }))}
        />
        <NumberField id="cand-basic" label="Basic" suffix={suffix} value={c.basic} onChange={(v) => set({ basic: v })} />
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Flexible allowance</div>
        {FLEX_FIELDS.map((f) => (
          <NumberField key={f.key} id={`cand-${f.key}`} label={f.label} suffix={suffix} value={c[f.key]} onChange={(v) => set({ [f.key]: v } as Partial<CandidateItemized>)} />
        ))}
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Retirals</div>
        {RETIRAL_FIELDS.map((f) => (
          <NumberField key={f.key} id={`cand-${f.key}`} label={f.label} suffix={suffix} value={c[f.key]} onChange={(v) => set({ [f.key]: v } as Partial<CandidateItemized>)} />
        ))}
        <NumberField id="cand-variable" label="Variable Pay / APLI / MPLI" suffix={suffix} value={c.variable} onChange={(v) => set({ variable: v })} />
      </div>
      <div className="lg:col-span-5">
        <div className="sticky top-4 flex flex-col gap-1 rounded border border-hairline bg-surface p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Running totals</div>
          <ReadoutRow label="Total fixed (monthly)" value={fmt(d.totalFixedMonthly)} />
          <ReadoutRow label="Total fixed (annual)" value={fmt(d.totalFixedMonthly * 12)} />
          <ReadoutRow label={INPUT_COPY.currentAnnualFixedWithoutGratuity.label} tooltip={INPUT_COPY.currentAnnualFixedWithoutGratuity.tooltip} value={fmt(d.currentAnnualFixedWithoutGratuity)} strong />
          <ReadoutRow label={INPUT_COPY.currentAnnualVariable.label} tooltip={INPUT_COPY.currentAnnualVariable.tooltip} value={fmt(d.currentAnnualVariable)} strong />
          <div className="mt-1 border-t border-hairline pt-2">
            <ReadoutRow label="Current total CTC (p.a.)" value={fmt(d.currentAnnualFixedWithoutGratuity + d.currentAnnualVariable)} strong />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OfferSection({ form, setForm, master }: SectionProps) {
  const set = patchers(setForm).offer;
  const band = bandForLevel(form.offer.level, master.levels[form.offer.level]);
  const onLevelChange = (raw: string) => {
    const level = raw as LevelId;
    const newBand = bandForLevel(level, master.levels[level]);
    const variablePct = defaultMpliForLevel(master, level) ?? newBand.variablePctOptions[0];
    // Crossing bands: reset variable % to the band default, clamp NPS to the new
    // max, and clear Car Allowance when the new band doesn't use it.
    setForm((f) => ({
      ...f,
      offer: { ...f.offer, level, variablePct, carAllowance: newBand.hasCarAllowance ? f.offer.carAllowance : 0 },
      structure: { ...f.structure, npsPct: Math.min(f.structure.npsPct, newBand.npsMaxPct) },
    }));
  };
  return (
    <div className="flex flex-col gap-3">
      <SelectField<LevelId> id="offer-level" label={INPUT_COPY.level.label} value={form.offer.level} options={LEVEL_OPTIONS.map((l) => ({ value: l, label: l }))} onChange={onLevelChange} />
      <SelectField<number>
        id="offer-variable"
        label={band.variablePctLabel}
        tooltip={
          band.variableOfFixed
            ? `APB is applied on Fixed salary (auto-set per level; override if needed). E.g. 25% of Fixed = ${((25 / 125) * 100).toFixed(0)}% of CTC.`
            : `Variable pay (${band.variableShortLabel}) as % of CTC. Auto-set to the band rate for the level; override if needed.`
        }
        value={form.offer.variablePct}
        options={band.variablePctOptions.map((p) => ({
          value: p,
          label: band.variableOfFixed ? `${p}% of Fixed (= ${((p / (100 + p)) * 100).toFixed(1).replace(/\.0$/, '')}% of CTC)` : `${p}%`,
        }))}
        onChange={(raw) => set({ variablePct: Number(raw) })}
      />
      <SelectField<FinalOption> id="offer-final" label={INPUT_COPY.finalOption.label} tooltip={INPUT_COPY.finalOption.tooltip} value={form.offer.finalOption} options={[
        { value: 1, label: 'Option 1 · +10%' },
        { value: 2, label: 'Option 2 · +15%' },
        { value: 3, label: 'Option 3 · +20%' },
        { value: 4, label: 'Option 4 · Manual' },
      ]} onChange={(raw) => set({ finalOption: Number(raw) as FinalOption })} />
      <ToggleField<'amount' | 'percent'>
        label="Option 4 — manual mode"
        tooltip="Build option 4 either from an absolute Total CTC, or from a custom % increase on the current CTC."
        value={form.offer.manualOption4Mode}
        options={[{ value: 'amount', label: 'Absolute CTC' }, { value: 'percent', label: '% increase' }]}
        onChange={(v) => set({ manualOption4Mode: v })}
      />
      {form.offer.manualOption4Mode === 'amount' ? (
        <NumberField id="offer-manual" label={INPUT_COPY.manualOption4CTC.label} tooltip={INPUT_COPY.manualOption4CTC.tooltip} value={form.offer.manualOption4CTC} step={1000} onChange={(v) => set({ manualOption4CTC: v })} />
      ) : (
        <NumberField id="offer-manual-pct" label="Option 4 — % increase" tooltip="Custom increase applied to the current total CTC (rounded per band rules)." prefix="" suffix="%" step={0.5} value={form.offer.manualOption4Pct} onChange={(v) => set({ manualOption4Pct: v })} />
      )}
      {band.hasCarAllowance && (
        <NumberField id="offer-car" label="Car Allowance (p.a.)" tooltip="Optional car allowance, added to Total Remuneration (M-2 to M-4)." value={form.offer.carAllowance} step={1000} onChange={(v) => set({ carAllowance: v })} />
      )}
    </div>
  );
}

export function StructureSection({ form, setForm }: Omit<SectionProps, 'master'>) {
  const set = patchers(setForm).structure;
  const band = bandForLevel(form.offer.level);
  return (
    <div className="flex flex-col gap-3">
      <SelectField<BasicPct> id="struct-basic" label={INPUT_COPY.basicPct.label} tooltip={INPUT_COPY.basicPct.tooltip} value={form.structure.basicPct} options={numOpts(BASIC_OPTIONS) as { value: BasicPct; label: string }[]} onChange={(raw) => set({ basicPct: Number(raw) as BasicPct })} />
      <SelectField<HraPct> id="struct-hra" label={INPUT_COPY.hraPct.label} tooltip={INPUT_COPY.hraPct.tooltip} value={form.structure.hraPct} options={numOpts(HRA_OPTIONS) as { value: HraPct; label: string }[]} onChange={(raw) => set({ hraPct: Number(raw) as HraPct })} />
      <SelectField<number> id="struct-nps" label={INPUT_COPY.npsPct.label} tooltip={`Employer NPS as % of annual Basic (0–${band.npsMaxPct}%).`} value={form.structure.npsPct} options={npsOptions(band.npsMaxPct).map((p) => ({ value: p, label: `${p}%` }))} onChange={(raw) => set({ npsPct: Number(raw) })} />
      <ToggleField<YesNo> label={INPUT_COPY.pf.label} tooltip={INPUT_COPY.pf.tooltip} value={form.structure.pf} options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]} onChange={(v) => set({ pf: v })} />
      <NumberField id="struct-food" label={INPUT_COPY.foodCouponsMonthly.label} tooltip={INPUT_COPY.foodCouponsMonthly.tooltip} value={form.structure.foodCouponsMonthly} suffix="/mo" onChange={(v) => set({ foodCouponsMonthly: v })} />
    </div>
  );
}

export function EligibilitySection({ form, setForm }: Omit<SectionProps, 'master'>) {
  const set = patchers(setForm).eligibility;
  return (
    <div className="flex flex-col gap-3">
      <ToggleField<boolean> label={INPUT_COPY.isPlant.label} tooltip={INPUT_COPY.isPlant.tooltip} value={form.eligibility.isPlant} options={[{ value: true, label: 'Plant' }, { value: false, label: 'Non-plant' }]} onChange={(v) => set({ isPlant: v })} />
      <ToggleField<boolean> label={INPUT_COPY.isMetro.label} tooltip={INPUT_COPY.isMetro.tooltip} value={form.eligibility.isMetro} options={[{ value: true, label: 'Metro' }, { value: false, label: 'Non-metro' }]} onChange={(v) => set({ isMetro: v })} />
      <ToggleField<YesNo> label={INPUT_COPY.transport.label} tooltip={INPUT_COPY.transport.tooltip} value={form.eligibility.transport} options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]} onChange={(v) => set({ transport: v })} />
      <SelectField<ChildCount> id="elig-cea" label={INPUT_COPY.cea.label} value={form.eligibility.cea} options={CHILD_OPTIONS} onChange={(raw) => set({ cea: raw as ChildCount })} />
      <SelectField<ChildCount> id="elig-cha" label={INPUT_COPY.cha.label} value={form.eligibility.cha} options={CHILD_OPTIONS} onChange={(raw) => set({ cha: raw as ChildCount })} />
      <ToggleField<YesNo> label={INPUT_COPY.ber.label} tooltip={INPUT_COPY.ber.tooltip} value={form.eligibility.ber} options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]} onChange={(v) => set({ ber: v })} />
      <ToggleField<YesNo> label={INPUT_COPY.lta.label} tooltip={INPUT_COPY.lta.tooltip} value={form.eligibility.lta} options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]} onChange={(v) => set({ lta: v })} />
    </div>
  );
}

export function MetaSection({ form, setForm }: Omit<SectionProps, 'master'>) {
  const set = patchers(setForm).meta;
  const m = form.meta;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <TextField id="meta-name" label={INPUT_COPY.name.label} value={m.name} placeholder="e.g. A. Sharma" onChange={(v) => set({ name: v })} />
      <TextField id="meta-position" label={INPUT_COPY.position.label} value={m.position} placeholder="e.g. Senior Manager" onChange={(v) => set({ position: v })} />
      <TextField id="meta-location" label={INPUT_COPY.location.label} value={m.location} placeholder="e.g. Mumbai" onChange={(v) => set({ location: v })} />
      <TextField id="meta-sap" label={INPUT_COPY.sapCode.label} value={m.sapCode} placeholder="optional" onChange={(v) => set({ sapCode: v })} />
      <TextField id="meta-company" label={INPUT_COPY.company.label} value={m.company} placeholder="optional" onChange={(v) => set({ company: v })} />
      <TextField id="meta-date" type="date" label={INPUT_COPY.offerDate.label} value={m.date} onChange={(v) => set({ date: v })} />
    </div>
  );
}

const RETENTION_FIELDS: { key: keyof Addons; label: string }[] = [
  { key: 'retention12', label: '12 months' },
  { key: 'retention24', label: '24 months' },
  { key: 'retention36', label: '36 months' },
];
const LTIP_FIELDS: { key: keyof Addons; label: string }[] = [
  { key: 'ltip12', label: '12 months' },
  { key: 'ltip24', label: '24 months' },
  { key: 'ltip36', label: '36 months' },
  { key: 'ltip48', label: '48 months' },
];

export function AddonsSection({ form, setForm }: Omit<SectionProps, 'master'>) {
  const set = patchers(setForm).addons;
  const a = form.addons;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Retention bonus (on completion)</div>
        {RETENTION_FIELDS.map((f) => (
          <NumberField key={f.key} id={`add-${f.key}`} label={f.label} value={a[f.key]} step={1000} onChange={(v) => set({ [f.key]: v } as Partial<Addons>)} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Joining bonus</div>
        <NumberField id="add-joining" label="In lieu of lost variable" value={a.joining} step={1000} onChange={(v) => set({ joining: v })} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">LTIP (on completion)</div>
        {LTIP_FIELDS.map((f) => (
          <NumberField key={f.key} id={`add-${f.key}`} label={f.label} value={a[f.key]} step={1000} onChange={(v) => set({ [f.key]: v } as Partial<Addons>)} />
        ))}
      </div>
    </div>
  );
}
