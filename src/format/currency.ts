export interface CurrencyOpts {
  paise?: boolean; // show 2 decimal places (default false = whole rupees)
  symbol?: boolean; // prepend ₹ (default true)
}

/**
 * Indian-grouping fallback (used when Intl 'en-IN' is unavailable). Groups the
 * last three digits, then in pairs: 16,94,400 / 1,00,00,000.
 */
export function groupIndian(value: number, paise = false): string {
  const neg = value < 0;
  const abs = Math.abs(value);
  const fixed = paise ? abs.toFixed(2) : String(Math.round(abs));
  const [intPart, decPart] = fixed.split('.');
  let grouped = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  const out = decPart ? `${grouped}.${decPart}` : grouped;
  return neg ? `-${out}` : out;
}

/** Format an INR amount with Indian digit grouping (e.g. ₹16,94,400). */
export function formatINR(value: number, opts: CurrencyOpts = {}): string {
  const { paise = false, symbol = true } = opts;
  if (!Number.isFinite(value)) return '—';

  let out: string;
  try {
    out = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: paise ? 2 : 0,
      maximumFractionDigits: paise ? 2 : 0,
    }).format(value);
  } catch {
    out = `₹${groupIndian(value, paise)}`;
  }

  if (!symbol) {
    // Strip the ₹ symbol (and any adjacent non-breaking space) for TSV/plain output.
    out = out.replace(/₹\s?/g, '').replace(/ /g, '').trim();
  }
  return out;
}

/** Format a fraction as a percentage, e.g. 0.20103 -> "+20.1%". null -> "—". */
export function formatPct(value: number | null, signed = false): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const pct = value * 100;
  const sign = signed && pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}
