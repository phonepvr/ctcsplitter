import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Inputs, OfferResult, LevelMaster, FinalOption } from '../engine/types';
import type { FormState } from '../state/form';
import { Stepper, type StepDef } from './Stepper';
import { Button, Eyebrow } from './common/ui';
import { CandidateSection, OfferSection, StructureSection, EligibilitySection, MetaSection, AddonsSection } from './inputs/sections';
import { ComparisonPanel } from './comparison/ComparisonPanel';
import { StructurePanel } from './structure/StructurePanel';
import { formatINR, formatPct } from '../format/currency';

const STEPS: StepDef[] = [
  { id: 1, title: 'Current pay' },
  { id: 2, title: 'Offer' },
  { id: 3, title: 'Structure' },
  { id: 4, title: 'Review' },
];

const NEXT_LABEL: Record<number, string> = {
  1: 'Continue to offer',
  2: 'Continue to structure',
  3: 'Review offer',
};

interface WizardProps {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  master: LevelMaster;
  inputs: Inputs;
  result: OfferResult;
  tooltips: Record<string, string>;
  paise: boolean;
  setPaise: (v: boolean) => void;
}

function StepHead({ n, title, intro }: { n: number; title: string; intro: string }) {
  return (
    <div className="mb-4 no-print">
      <div className="eyebrow">Step {n} of 4</div>
      <h2 className="text-h2 text-ink">{title}</h2>
      <p className="mt-1 max-w-2xl text-[13px] text-muted">{intro}</p>
    </div>
  );
}

function Recap({ result, paise }: { result: OfferResult; paise: boolean }) {
  const s = result.summary;
  const items = [
    { label: 'Total CTC', value: formatINR(s.offerCTC, { paise }), delta: s.pctIncCTC },
    { label: 'Fixed salary', value: formatINR(s.offerFixed, { paise }), delta: s.pctIncFixed },
    { label: `${result.band.variableShortLabel} (variable)`, value: formatINR(s.offerMPLI, { paise }), delta: s.pctIncMPLI },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="card p-3">
          <div className="eyebrow">{it.label}</div>
          <div className="tnum font-display text-[24px] leading-tight text-ink">{it.value}</div>
          <div className="text-[12px] text-muted">{formatPct(it.delta, true)} vs current</div>
        </div>
      ))}
    </div>
  );
}

export function Wizard({ form, setForm, master, inputs, result, tooltips, paise, setPaise }: WizardProps) {
  const [step, setStep] = useState(1);
  const go = (n: number) => setStep(Math.min(4, Math.max(1, n)));
  const setFinal = (o: FinalOption) => setForm((f) => ({ ...f, offer: { ...f.offer, finalOption: o } }));

  return (
    <div className="flex flex-col gap-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
        <Stepper steps={STEPS} current={step} onJump={go} />
        <label className="flex items-center gap-2 text-[12px] text-graphite-700">
          <input type="checkbox" checked={paise} onChange={(e) => setPaise(e.target.checked)} />
          Show paise
        </label>
      </div>

      {step === 1 && (
        <div>
          <StepHead n={1} title="Candidate's current pay" intro="Enter the candidate's current monthly components. We total them and work out the annual fixed (without gratuity) and variable used to build the offer." />
          <CandidateSection form={form} setForm={setForm} />
        </div>
      )}

      {step === 2 && (
        <div>
          <StepHead n={2} title="Build the offer" intro="Capture the offer details, pick the level and MPLI %, then choose one of the four options — tap a card or use the dropdown. The selected option is carried into the structure." />
          <div className="mb-5">
            <Eyebrow>Offer details</Eyebrow>
            <div className="mt-2">
              <MetaSection form={form} setForm={setForm} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <OfferSection form={form} setForm={setForm} master={master} />
            </div>
            <div className="lg:col-span-8">
              <ComparisonPanel result={result} tooltips={tooltips} paise={paise} onSelectOption={setFinal} />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <StepHead n={3} title="Shape the salary structure" intro="Set how the fixed salary splits into components, and which benefits apply. The offer-letter breakup on the right updates as you change anything." />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="flex flex-col gap-5 lg:col-span-5">
              <div>
                <Eyebrow>Structure</Eyebrow>
                <div className="mt-2">
                  <StructureSection form={form} setForm={setForm} />
                </div>
              </div>
              <div>
                <Eyebrow>Eligibility</Eyebrow>
                <div className="mt-2">
                  <EligibilitySection form={form} setForm={setForm} />
                </div>
              </div>
            </div>
            <div className="lg:col-span-7">
              <StructurePanel result={result} inputs={inputs} tooltips={tooltips} paise={paise} compact />
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <StepHead n={4} title="Review & share" intro="Add any bonuses, confirm the offer, then copy the structure straight into the letter or save it as a PDF." />
          <Recap result={result} paise={paise} />
          <div className="no-print card p-3">
            <Eyebrow>Add-ons (optional)</Eyebrow>
            <p className="mb-3 mt-1 text-[12px] text-muted">Retention, joining and LTIP amounts appear in the copied and printed letter.</p>
            <AddonsSection form={form} setForm={setForm} />
          </div>
          <StructurePanel result={result} inputs={inputs} tooltips={tooltips} paise={paise} meta={form.meta} addons={form.addons} />
        </div>
      )}

      <div className="no-print flex items-center justify-between border-t border-hairline pt-3">
        <Button variant="ghost" disabled={step === 1} onClick={() => go(step - 1)}>
          ← Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => go(step + 1)}>{NEXT_LABEL[step]} →</Button>
        ) : (
          <Button variant="ghost" onClick={() => go(1)}>Start over</Button>
        )}
      </div>
    </div>
  );
}
