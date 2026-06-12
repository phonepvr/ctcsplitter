import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeOffer, displayLines } from '../engine/engine';
import { bundledMaster } from '../data/levelMaster';
import { buildStructureTSV, buildStructureHTML, copyOfferToClipboard } from './clipboard';
import { ZERO_ADDONS } from '../state/form';
import type { Inputs } from '../engine/types';

const golden: Inputs = {
  candidate: { currentAnnualFixedWithoutGratuity: 3104004, currentAnnualVariable: 579180 },
  offer: { level: 'M-9', variablePct: 12, finalOption: 2, manualOption4Mode: 'amount', manualOption4CTC: 15_000_000, manualOption4Pct: 15, carAllowance: 0 },
  structure: { basicPct: 40, hraPct: 40, npsPct: 0, pf: 'Y', foodCouponsMonthly: 9600 },
  eligibility: { isPlant: true, isMetro: false, transport: 'Y', cea: 'ONE', cha: 'ONE', ber: 'Y', lta: 'N' },
};
const result = computeOffer(golden, bundledMaster);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('buildStructureTSV', () => {
  it('emits the fitment rows (zeros omitted) and the over-and-above block', () => {
    const tsv = buildStructureTSV(result);
    const lines = tsv.split('\n');
    expect(lines[0]).toContain('Salary Component');
    expect(tsv).toContain('Basic Pay');
    expect(tsv).toContain('16,94,400');
    expect(tsv).toContain('Grand Total');
    expect(tsv).toContain('Mediclaim');
    // zero components (LTA = N, NPS = 0) are omitted from the export
    expect(tsv).not.toContain('Leave Travel Allowance');
    expect(tsv).not.toContain('National Pension System');
    // header + filtered structure lines + over-above divider + 5 over-above rows
    const visible = displayLines(result.structure, true).length;
    expect(lines).toHaveLength(1 + visible + 1 + 5);
    // tab-delimited, 4 columns
    expect(lines[1].split('\t')).toHaveLength(4);
  });

  it('states gratuity instead of calculating it', () => {
    const tsv = buildStructureTSV(result);
    expect(tsv).toContain('retire or resign');
    expect(tsv).not.toContain('81,500'); // no computed gratuity amount
  });
});

describe('buildStructureTSV with header + add-ons', () => {
  it('includes the offer header and only the non-zero add-ons', () => {
    const tsv = buildStructureTSV(
      result,
      {},
      {
        meta: { name: 'A. Sharma', sapCode: 'SAP123', company: 'AcmeCo', position: 'Sr Manager', location: 'Mumbai', date: '2026-05-29' },
        level: 'M-9',
        isPlant: true,
        addons: { ...ZERO_ADDONS, retention12: 500000, joining: 200000 },
      },
    );
    expect(tsv).toContain('Offer details');
    expect(tsv).toContain('A. Sharma');
    expect(tsv).toContain('SAP Code');
    expect(tsv).toContain('AcmeCo');
    expect(tsv).toContain('M-9'); // level row
    expect(tsv).toContain('Plant'); // plant / non-plant row
    expect(tsv).toContain('Bonuses & incentives');
    expect(tsv).toContain('Retention bonus — 12 months');
    expect(tsv).toContain('Joining bonus (in lieu of lost variable)');
    expect(tsv).not.toContain('LTIP — 48 months'); // zero entries omitted
  });
});

describe('buildStructureHTML', () => {
  it('produces a parseable table with bordered cells', () => {
    const html = buildStructureHTML(result);
    expect(html.startsWith('<table')).toBe(true);
    expect(html).toContain('Basic Pay');
    expect(html).toContain('border:1px solid');
  });

  it('renders the offer header as its own 2-column table (wide value column)', () => {
    const html = buildStructureHTML(
      result,
      {},
      {
        meta: { name: 'Kishor', sapCode: '', company: '', position: 'Senior Manager', location: 'Mumbai', date: '2026-05-30' },
        level: 'M-9',
        isPlant: true,
      },
    );
    expect((html.match(/<table/g) ?? []).length).toBe(2); // offer-details + structure
    expect(html).toContain('colspan="2"'); // offer-details title spans its 2 cols
    expect(html).toContain('colspan="4"'); // section dividers span the structure
    expect(html).toContain('Senior Manager'); // long value no longer cramped
  });
});

describe('copyOfferToClipboard', () => {
  it('writes both text/html and text/plain for rich copy', async () => {
    const captured: Record<string, unknown>[] = [];
    class FakeClipboardItem {
      constructor(items: Record<string, unknown>) {
        captured.push(items);
      }
    }
    const write = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);
    vi.stubGlobal('navigator', { clipboard: { write } });

    await copyOfferToClipboard(result, 'rich');

    expect(write).toHaveBeenCalledTimes(1);
    expect(Object.keys(captured[0])).toEqual(expect.arrayContaining(['text/html', 'text/plain']));
  });

  it('uses writeText for plain TSV copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await copyOfferToClipboard(result, 'tsv');

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('Basic Pay');
  });
});
