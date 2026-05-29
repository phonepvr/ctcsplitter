import type { Inputs } from '../engine/types';

// All user-facing copy lives here, decoupled from the (pure-numeric) engine so
// it can be revised or localised without touching logic.

// Offer-letter "Remarks" column text (mirrors the Excel remarks). Static.
export const STRUCTURE_REMARKS: Record<string, string> = {
  basic: 'Fixed, guaranteed sum paid monthly. Capped 15–40% of CTC. Retirals and HRA are linked to Basic.',
  hra: 'Optional, paid monthly. Capped at 60% of Basic (metro) / 50% of Basic (non-metro).',
  personalAllowance: 'Special / fitment allowance — the balancing figure so all fixed components add up to Total Fixed Salary. No link to retirals.',
  transport: 'Optional, handicap-only. ₹1,600 p.m. / ₹19,200 p.a. Not applicable to M-1 & M-2.',
  cea: 'Optional. Up to ₹100 p.m. per child, maximum 2 children.',
  cha: 'Optional. Up to ₹300 p.m. per child, maximum 2 children.',
  foodCoupons: 'Optional meal coupons (entered monthly).',
  washing: 'Uniform maintenance allowance — fixed ₹1,000 p.m., plant-location employees only.',
  totalA: 'Sum of Basic, HRA, Personal Allowance and the optional allowances.',
  ber: 'Vehicle, professional and telephone expenses, reimbursed against original bills.',
  lta: 'Leave Travel Assistance — reimbursed for travel on leave within India.',
  totalReimbB: 'Total reimbursements (BER + LTA).',
  pf: 'Employer PF = 12% of Basic. The employee contributes a matching amount from salary.',
  nps: 'Optional. Max 10% (old regime) / 14% (new regime) of Basic; minimum ₹6,000 p.a.',
  totalRetiralsC: 'Total retirals (PF + NPS).',
  bPlusC: 'Reimbursements + retirals.',
  totalFixed: 'Guaranteed annual fixed salary (A + B + C).',
  mpli: 'Illustrative at 100% payout. Actual payout depends on employee and company performance.',
  grandTotal: 'Total annual target CTC = Total Fixed Salary + MPLI.',
};

/**
 * Calculation tooltips — the "(i)" content from the spec, interpolated with the
 * live inputs so the explanation always reflects the chosen percentages.
 */
export function buildTooltips(i: Inputs): Record<string, string> {
  return {
    // --- offer options ---
    'option.totalCTC': 'Current total CTC increased by 10% / 15% / 20%, rounded to the nearest ₹1,000. Option 4 is a manually entered absolute CTC.',
    'option.mpli': `MPLI = Total Target CTC × MPLI% (${i.offer.mpliPct}%), rounded to nearest ₹1,000. This is the variable-pay portion.`,
    'option.fixed': 'Fixed (guaranteed) salary = Total Target CTC − MPLI.',
    // --- Section A summary ---
    'summary.offerFixed': 'The fixed salary of the selected final option.',
    'summary.pctIncFixed': "Increase of the offered fixed salary over the candidate's current fixed salary (without gratuity).",
    'summary.offerMPLI': "Variable pay of the selected option, and its change vs the candidate's current variable pay.",
    'summary.offerCTC': 'Total CTC of the selected option and its increase over current total CTC.',
    'summary.varToTotal': 'Share of total CTC that is variable (MPLI ÷ Total CTC). Lower = more guaranteed pay.',
    // --- Section D structure ---
    basic: `Basic salary = ${i.structure.basicPct}% of total CTC. Capped 15–40% of CTC. HRA and retirals are linked to Basic.`,
    hra: `House Rent Allowance = ${i.structure.hraPct}% of Basic. Cap: 60% of Basic (metro) / 50% (non-metro).`,
    personalAllowance: 'Special / fitment allowance. Calculated as the residual so that all fixed components add up to the Total Fixed Salary. No link to retirals.',
    transport: 'Optional, handicap-only. ₹1,600 p.m. / ₹19,200 p.a. Not applicable to M-1 & M-2.',
    cea: 'Up to ₹100 p.m. per child, max 2 children (₹3,000 p.m. for 1 / ₹6,000 for 2).',
    cha: 'Up to ₹300 p.m. per child, max 2 children (₹9,000 p.m. for 1 / ₹18,000 for 2).',
    foodCoupons: 'Optional. Entered monthly; the annual value is the monthly amount × 12.',
    washing: 'Fixed ₹1,000 p.m. for plant-location employees only.',
    ber: 'Covers vehicle, professional and telephone expenses, against original bills.',
    lta: 'Leave Travel Assistance, reimbursed against travel-on-leave within India.',
    pf: 'Employer PF = 12% of annual Basic. Employee contributes a matching amount from salary.',
    nps: `Employer NPS = ${i.structure.npsPct}% of annual Basic. Max 10% (old regime) / 14% (new regime); min ₹6,000 p.a.`,
    totalFixed: 'Total Fixed Salary (A + B + C) — equals the offered fixed salary; the Personal Allowance plug guarantees this.',
    mpli: 'Monthly Performance Linked Incentive — the variable pay of the selected option.',
    grandTotal: 'Grand Total = Total Fixed Salary + MPLI = the offered Total CTC.',
    // --- Section C over-and-above ---
    'oa.mediclaim': 'Annual health insurance cover for self, spouse and first two dependent children, by level.',
    'oa.gpa': 'Group accident insurance cover for self, by level.',
    'oa.term': 'Term life cover for self, by level.',
    'oa.mobile': 'Monthly mobile bill reimbursement, by level.',
    'oa.gratuity': 'Statutory gratuity provision = 4.81% of annual Basic. Payable after 5 years of continuous service.',
  };
}

// Input field labels + helper tooltips (Group 1–4 of the spec).
export interface FieldCopy {
  label: string;
  tooltip?: string;
}

export const INPUT_COPY: Record<string, FieldCopy> = {
  currentAnnualFixedWithoutGratuity: { label: 'Current annual fixed (without gratuity)', tooltip: 'Sum of the candidate’s current fixed monthly components × 12, minus gratuity. Feeds the % fixed increase.' },
  currentAnnualVariable: { label: 'Current annual variable / MPLI', tooltip: 'Current variable pay per year. Feeds the % variable change.' },
  level: { label: 'Level' },
  mpliPct: { label: 'MPLI %', tooltip: 'Variable-pay percentage of CTC. Defaults to the band for the selected level (M-9..M-11 = 12%, M-8 = 15%, M-5..M-7 = 20%).' },
  finalOption: { label: 'Final option', tooltip: 'Which of the four offer options to carry into the structure table.' },
  manualOption4CTC: { label: 'Option 4 — manual CTC', tooltip: 'Absolute Total CTC used only for option 4.' },
  basicPct: { label: 'Basic % of CTC', tooltip: 'Basic as a percentage of total CTC. Policy cap 15–40%.' },
  hraPct: { label: 'HRA % of Basic', tooltip: 'HRA as a percentage of Basic. Cap 60% (metro) / 50% (non-metro).' },
  npsPct: { label: 'Employer NPS %', tooltip: 'Employer NPS as a percentage of annual Basic (0–10%).' },
  pf: { label: 'Provident Fund (employer)', tooltip: '12% of annual Basic when Yes.' },
  foodCouponsMonthly: { label: 'Food coupons (monthly)', tooltip: 'Monthly food-coupon value; × 12 for the annual figure.' },
  isPlant: { label: 'Plant location', tooltip: 'Plant locations add a ₹1,000 p.m. washing/uniform allowance.' },
  transport: { label: 'Transport allowance (handicap)', tooltip: '₹1,600 p.m. when Yes. Treated as over-and-above (not absorbed into Personal Allowance).' },
  cea: { label: 'Children Education Allowance' },
  cha: { label: 'Children Hostel Allowance' },
  ber: { label: 'Business Expense Reimbursement', tooltip: 'Adds the level’s BER (per month × 12) when Yes.' },
  lta: { label: 'LTA reimbursement', tooltip: 'Adds the level’s LTA (per month × 12) when Yes.' },
  isMetro: { label: 'City type', tooltip: 'Metro raises the HRA cap to 60% of Basic (else 50%). Advisory only — it does not change the calculation.' },
  name: { label: 'Candidate name' },
  position: { label: 'Position' },
  location: { label: 'Location' },
  offerDate: { label: 'Offer date' },
};
