import { MONEY_ROUND } from './constants';

/**
 * Excel MROUND: round `value` to the nearest multiple of `multiple`,
 * rounding halves away from zero. All money in this app is positive, but the
 * sign guard keeps the helper correct for any input.
 */
export function mround(value: number, multiple: number = MONEY_ROUND): number {
  if (multiple === 0) return 0;
  const m = Math.abs(multiple);
  const sign = value < 0 ? -1 : 1;
  return sign * Math.floor(Math.abs(value) / m + 0.5) * m;
}
