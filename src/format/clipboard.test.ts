import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeOffer } from '../engine/engine';
import { bundledMaster } from '../data/levelMaster';
import { buildStructureTSV, buildStructureHTML, copyOfferToClipboard } from './clipboard';
import type { Inputs } from '../engine/types';

const golden: Inputs = {
  candidate: { currentAnnualFixedWithoutGratuity: 3104004, currentAnnualVariable: 579180 },
  offer: { level: 'M-9', mpliPct: 12, finalOption: 2, manualOption4CTC: 15_000_000 },
  structure: { basicPct: 40, hraPct: 40, npsPct: 0, pf: 'Y', foodCouponsMonthly: 9600 },
  eligibility: { isPlant: true, transport: 'Y', cea: 'ONE', cha: 'ONE', ber: 'Y', lta: 'N' },
};
const result = computeOffer(golden, bundledMaster);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('buildStructureTSV', () => {
  it('emits a header, every structure row and the over-and-above block', () => {
    const tsv = buildStructureTSV(result);
    const lines = tsv.split('\n');
    expect(lines[0]).toContain('Salary Component');
    expect(tsv).toContain('Basic Pay');
    expect(tsv).toContain('16,94,400');
    expect(tsv).toContain('Grand Total');
    expect(tsv).toContain('Mediclaim');
    // header + 19 structure lines + over-above header + 5 over-above rows
    expect(lines).toHaveLength(1 + result.structure.lines.length + 6);
    // tab-delimited, 4 columns
    expect(lines[1].split('\t')).toHaveLength(4);
  });
});

describe('buildStructureHTML', () => {
  it('produces a parseable table with bordered cells', () => {
    const html = buildStructureHTML(result);
    expect(html.startsWith('<table')).toBe(true);
    expect(html).toContain('Basic Pay');
    expect(html).toContain('border:1px solid');
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
