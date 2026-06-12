import { describe, it, expect } from 'vitest';
import { deriveCandidate, toInputs, initialForm, ZERO_CANDIDATE } from './form';

describe('deriveCandidate — entry mode', () => {
  const items = { ...ZERO_CANDIDATE, basic: 500000, hra: 100000, gratuity: 45214, variable: 579180 };

  it('annual mode divides entries by 12 (feedback: 5L basic must not become 60L)', () => {
    const d = deriveCandidate(items, 'annual');
    expect(d.totalFixedMonthly).toBeCloseTo((500000 + 100000 + 45214) / 12, 6);
    // annual fixed (without gratuity) round-trips to the entered annual values
    expect(d.currentAnnualFixedWithoutGratuity).toBeCloseTo(500000 + 100000, 6);
    expect(d.currentAnnualVariable).toBeCloseTo(579180, 6);
  });

  it('monthly mode keeps the original ×12 behaviour', () => {
    const d = deriveCandidate(items, 'monthly');
    expect(d.totalFixedMonthly).toBe(500000 + 100000 + 45214);
    expect(d.currentAnnualFixedWithoutGratuity).toBe((500000 + 100000) * 12);
    expect(d.currentAnnualVariable).toBe(579180 * 12);
  });
});

describe('toInputs', () => {
  it('respects the form entry mode (default annual)', () => {
    const form = initialForm('M-9', 12);
    expect(form.entryMode).toBe('annual');
    form.candidate.basic = 3104004; // entered as ANNUAL
    const inputs = toInputs(form);
    expect(inputs.candidate.currentAnnualFixedWithoutGratuity).toBeCloseTo(3104004, 4);
  });
});
