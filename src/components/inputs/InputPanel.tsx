import type { Dispatch, SetStateAction } from 'react';
import type {
  LevelId, MpliPct, BasicPct, HraPct, NpsPct, YesNo, ChildCount, FinalOption, LevelMaster,
} from '../../engine/types';
import { defaultMpliForLevel } from '../../engine/engine';
import {
  LEVEL_OPTIONS, MPLI_OPTIONS, NPS_OPTIONS, BASIC_OPTIONS, HRA_OPTIONS, CHILD_OPTIONS,
} from '../../data/data';
import { INPUT_COPY } from '../../data/strings';
import { formatINR } from '../../format/currency';
import {
  type FormState, type CandidateItemized, deriveCandidate,
} from '../../state/form';
import { NumberField, SelectField, ToggleField, InputGroup, ReadoutRow } from './fields';

interface InputPanelProps {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
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

export function InputPanel({ form, setForm, master }: InputPanelProps) {
  const setCandidate = (patch: Partial<CandidateItemized>) =>
    setForm((f) => ({ ...f, candidate: { ...f.candidate, ...patch } }));
  const setOffer = (patch: Partial<FormState['offer']>) =>
    setForm((f) => ({ ...f, offer: { ...f.offer, ...patch } }));
  const setStructure = (patch: Partial<FormState['structure']>) =>
    setForm((f) => ({ ...f, structure: { ...f.structure, ...patch } }));
  const setEligibility = (patch: Partial<FormState['eligibility']>) =>
    setForm((f) => ({ ...f, eligibility: { ...f.eligibility, ...patch } }));

  const onLevelChange = (raw: string) => {
    const level = raw as LevelId;
    const band = defaultMpliForLevel(master, level);
    setOffer({ level, ...(band ? { mpliPct: band } : {}) });
  };

  const c = form.candidate;
  const d = deriveCandidate(c);
  const fmt = (n: number) => formatINR(n, { symbol: true });

  return (
    <div className="flex flex-col gap-3">
      <InputGroup title="Candidate — current (monthly)">
        <NumberField
          id="cand-basic"
          label="Basic"
          value={c.basic}
          onChange={(v) => setCandidate({ basic: v })}
        />
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Flexible allowance</div>
        {FLEX_FIELDS.map((f) => (
          <NumberField
            key={f.key}
            id={`cand-${f.key}`}
            label={f.label}
            value={c[f.key]}
            onChange={(v) => setCandidate({ [f.key]: v } as Partial<CandidateItemized>)}
          />
        ))}
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Retirals</div>
        {RETIRAL_FIELDS.map((f) => (
          <NumberField
            key={f.key}
            id={`cand-${f.key}`}
            label={f.label}
            value={c[f.key]}
            onChange={(v) => setCandidate({ [f.key]: v } as Partial<CandidateItemized>)}
          />
        ))}
        <NumberField
          id="cand-variable"
          label="Variable Pay / APLI / MPLI"
          value={c.variable}
          onChange={(v) => setCandidate({ variable: v })}
        />

        <div className="mt-1 flex flex-col gap-1 rounded bg-surface p-2">
          <ReadoutRow label="Total fixed (monthly)" value={fmt(d.totalFixedMonthly)} />
          <ReadoutRow
            label={INPUT_COPY.currentAnnualFixedWithoutGratuity.label}
            tooltip={INPUT_COPY.currentAnnualFixedWithoutGratuity.tooltip}
            value={fmt(d.currentAnnualFixedWithoutGratuity)}
            strong
          />
          <ReadoutRow
            label={INPUT_COPY.currentAnnualVariable.label}
            tooltip={INPUT_COPY.currentAnnualVariable.tooltip}
            value={fmt(d.currentAnnualVariable)}
            strong
          />
          <ReadoutRow
            label="Current total CTC (p.a.)"
            value={fmt(d.currentAnnualFixedWithoutGratuity + d.currentAnnualVariable)}
            strong
          />
        </div>
      </InputGroup>

      <InputGroup title="Offer parameters">
        <SelectField<LevelId>
          id="offer-level"
          label={INPUT_COPY.level.label}
          value={form.offer.level}
          options={LEVEL_OPTIONS.map((l) => ({ value: l, label: l }))}
          onChange={onLevelChange}
        />
        <SelectField<MpliPct>
          id="offer-mpli"
          label={INPUT_COPY.mpliPct.label}
          tooltip={INPUT_COPY.mpliPct.tooltip}
          value={form.offer.mpliPct}
          options={numOpts(MPLI_OPTIONS) as { value: MpliPct; label: string }[]}
          onChange={(raw) => setOffer({ mpliPct: Number(raw) as MpliPct })}
        />
        <SelectField<FinalOption>
          id="offer-final"
          label={INPUT_COPY.finalOption.label}
          tooltip={INPUT_COPY.finalOption.tooltip}
          value={form.offer.finalOption}
          options={[
            { value: 1, label: 'Option 1 · +10%' },
            { value: 2, label: 'Option 2 · +15%' },
            { value: 3, label: 'Option 3 · +20%' },
            { value: 4, label: 'Option 4 · Manual' },
          ]}
          onChange={(raw) => setOffer({ finalOption: Number(raw) as FinalOption })}
        />
        <NumberField
          id="offer-manual"
          label={INPUT_COPY.manualOption4CTC.label}
          tooltip={INPUT_COPY.manualOption4CTC.tooltip}
          value={form.offer.manualOption4CTC}
          step={1000}
          onChange={(v) => setOffer({ manualOption4CTC: v })}
        />
      </InputGroup>

      <InputGroup title="Salary structure">
        <SelectField<BasicPct>
          id="struct-basic"
          label={INPUT_COPY.basicPct.label}
          tooltip={INPUT_COPY.basicPct.tooltip}
          value={form.structure.basicPct}
          options={numOpts(BASIC_OPTIONS) as { value: BasicPct; label: string }[]}
          onChange={(raw) => setStructure({ basicPct: Number(raw) as BasicPct })}
        />
        <SelectField<HraPct>
          id="struct-hra"
          label={INPUT_COPY.hraPct.label}
          tooltip={INPUT_COPY.hraPct.tooltip}
          value={form.structure.hraPct}
          options={numOpts(HRA_OPTIONS) as { value: HraPct; label: string }[]}
          onChange={(raw) => setStructure({ hraPct: Number(raw) as HraPct })}
        />
        <SelectField<NpsPct>
          id="struct-nps"
          label={INPUT_COPY.npsPct.label}
          tooltip={INPUT_COPY.npsPct.tooltip}
          value={form.structure.npsPct}
          options={numOpts(NPS_OPTIONS) as { value: NpsPct; label: string }[]}
          onChange={(raw) => setStructure({ npsPct: Number(raw) as NpsPct })}
        />
        <ToggleField<YesNo>
          label={INPUT_COPY.pf.label}
          tooltip={INPUT_COPY.pf.tooltip}
          value={form.structure.pf}
          options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]}
          onChange={(v) => setStructure({ pf: v })}
        />
        <NumberField
          id="struct-food"
          label={INPUT_COPY.foodCouponsMonthly.label}
          tooltip={INPUT_COPY.foodCouponsMonthly.tooltip}
          value={form.structure.foodCouponsMonthly}
          suffix="/mo"
          onChange={(v) => setStructure({ foodCouponsMonthly: v })}
        />
      </InputGroup>

      <InputGroup title="Eligibility">
        <ToggleField<boolean>
          label={INPUT_COPY.isPlant.label}
          tooltip={INPUT_COPY.isPlant.tooltip}
          value={form.eligibility.isPlant}
          options={[{ value: true, label: 'Plant' }, { value: false, label: 'Non-plant' }]}
          onChange={(v) => setEligibility({ isPlant: v })}
        />
        <ToggleField<YesNo>
          label={INPUT_COPY.transport.label}
          tooltip={INPUT_COPY.transport.tooltip}
          value={form.eligibility.transport}
          options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]}
          onChange={(v) => setEligibility({ transport: v })}
        />
        <SelectField<ChildCount>
          id="elig-cea"
          label={INPUT_COPY.cea.label}
          value={form.eligibility.cea}
          options={CHILD_OPTIONS}
          onChange={(raw) => setEligibility({ cea: raw as ChildCount })}
        />
        <SelectField<ChildCount>
          id="elig-cha"
          label={INPUT_COPY.cha.label}
          value={form.eligibility.cha}
          options={CHILD_OPTIONS}
          onChange={(raw) => setEligibility({ cha: raw as ChildCount })}
        />
        <ToggleField<YesNo>
          label={INPUT_COPY.ber.label}
          tooltip={INPUT_COPY.ber.tooltip}
          value={form.eligibility.ber}
          options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]}
          onChange={(v) => setEligibility({ ber: v })}
        />
        <ToggleField<YesNo>
          label={INPUT_COPY.lta.label}
          tooltip={INPUT_COPY.lta.tooltip}
          value={form.eligibility.lta}
          options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]}
          onChange={(v) => setEligibility({ lta: v })}
        />
      </InputGroup>
    </div>
  );
}
