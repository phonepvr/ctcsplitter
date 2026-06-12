import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { computeOffer } from '../engine/engine';
import { bundledMaster } from '../data/levelMaster';
import { buildTooltips } from '../data/strings';
import { toInputs, initialForm, type FormState } from '../state/form';
import { ComparisonPanel } from './comparison/ComparisonPanel';
import { StructurePanel } from './structure/StructurePanel';
import { Wizard } from './Wizard';

// Golden form: M-9, Plant, Basic 40, HRA 40, Transport Y, CEA/CHA 1 child,
// Food 9600, BER Y, LTA N, PF Y, NPS 0, MPLI 12, option 2; candidate set so
// derived fixed-without-gratuity = 3,104,004 and variable = 579,180.
const form: FormState = {
  ...initialForm('M-9', 12),
  entryMode: 'monthly', // candidate values below are monthly (annual / 12)
  candidate: {
    basic: 0, educationOfficeWear: 0, broadbandFoodGift: 0, hra: 0, residualChoicePay: 0,
    additionalHra: 0, fuelMaintenance: 0, lta: 0, pf: 0, nps: 0, superannuation: 0,
    gratuity: 0, variable: 579180 / 12,
  },
  offer: { level: 'M-9', variablePct: 12, finalOption: 2, manualOption4Mode: 'amount', manualOption4CTC: 15_000_000, manualOption4Pct: 15, carAllowance: 0 },
  eligibility: { isPlant: true, isMetro: false, transport: 'Y', cea: 'ONE', cha: 'ONE', ber: 'Y', lta: 'N' },
};
// Put the whole fixed-without-gratuity into "basic" for the smoke test.
form.candidate.basic = 3104004 / 12;

const inputs = toInputs(form);
const result = computeOffer(inputs, bundledMaster);
const tooltips = buildTooltips(inputs);

describe('UI smoke render (golden numbers)', () => {
  it('renders the comparison panel with option 2 selected', () => {
    const html = renderToStaticMarkup(
      <ComparisonPanel result={result} tooltips={tooltips} paise={false} onSelectOption={() => {}} />,
    );
    expect(html).toContain('42,36,000'); // option 2 total CTC
    expect(html).toContain('Offer comparison');
    expect(html).toContain('Option 2');
  });

  it('renders the structure table with the golden breakup, header and add-ons', () => {
    const html = renderToStaticMarkup(
      <StructurePanel
        result={result}
        inputs={inputs}
        tooltips={tooltips}
        paise={false}
        meta={{ name: 'A. Sharma', sapCode: 'SAP123', company: 'AcmeCo', position: 'Sr Manager', location: 'Mumbai', date: '2026-05-29' }}
        addons={{ retention12: 500000, retention24: 0, retention36: 0, joining: 0, ltip12: 0, ltip24: 0, ltip36: 0, ltip48: 0 }}
      />,
    );
    expect(html).toContain('Basic Pay');
    expect(html).toContain('16,94,400'); // basic annual
    expect(html).toContain('Personal Allowance');
    expect(html).toContain('7,01,312'); // personal allowance
    expect(html).toContain('Grand Total');
    expect(html).toContain('Mediclaim');
    // transport overshoot warning is shown (transport = Y)
    expect(html).toContain('over-and-above');
    expect(html).toContain('A. Sharma'); // header — name (A1)
    expect(html).toContain('SAP123'); // header — SAP Code (A1)
    expect(html).toContain('AcmeCo'); // header — Company (A1)
    expect(html).toContain('Mumbai'); // header — Location
    expect(html).toContain('Bonuses'); // add-ons summary (A2)
    expect(html).toContain('5,00,000'); // retention bonus amount
    expect(html).toContain('retire or resign'); // gratuity statement, not amount
    expect(html).not.toContain('81,500'); // computed gratuity is not displayed
  });

  it('hides zero components on the final fitment sheet', () => {
    const html = renderToStaticMarkup(
      <StructurePanel result={result} inputs={inputs} tooltips={tooltips} paise={false} hideZeroRows />,
    );
    expect(html).not.toContain('Leave Travel Allowance'); // LTA = N
    expect(html).not.toContain('National Pension System'); // NPS = 0
    expect(html).toContain('Total Reimbursements B'); // non-zero subtotal stays
  });
});

describe('M2-M4 band', () => {
  it('shows APB and M-2 numbers on the comparison panel', () => {
    const m2Inputs = {
      ...inputs,
      offer: {
        level: 'M-2' as const, variablePct: 25, finalOption: 2 as const,
        manualOption4Mode: 'amount' as const, manualOption4CTC: 15_000_000, manualOption4Pct: 15, carAllowance: 0,
      },
    };
    const m2 = computeOffer(m2Inputs, bundledMaster);
    const html = renderToStaticMarkup(
      <ComparisonPanel result={m2} tooltips={buildTooltips(m2Inputs)} paise={false} onSelectOption={() => {}} />,
    );
    expect(m2.band.id).toBe('M2-M4');
    expect(html).toContain('APB');
    expect(html).toContain('33,88,000'); // M-2 fixed
    expect(html).toContain('Var : Fixed — offer'); // band-aware ratio label
  });
});

describe('Wizard step flow', () => {
  it('renders the stepper and starts on step 1', () => {
    const html = renderToStaticMarkup(
      <Wizard
        form={form}
        setForm={() => {}}
        master={bundledMaster}
        inputs={inputs}
        result={result}
        tooltips={tooltips}
        paise={false}
        setPaise={() => {}}
      />,
    );
    expect(html).toContain('Step 1 of 4');
    expect(html).toContain('Current pay'); // stepper label
    expect(html).toContain('Review'); // stepper label for step 4
    expect(html).toContain('Continue to offer'); // primary nav button
  });
});
