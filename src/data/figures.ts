/**
 * The arithmetic behind a sentence about money.
 *
 * Extracted from `finding.ts` when the Phase 10 generator needed the same four
 * operations. Two copies of "what is a percentage change, and what do we do when the
 * denominator is zero" is exactly the kind of duplication that ends with a card and a
 * panel stating different numbers about the same series.
 *
 * Every figure still leaves through `format.ts` — these functions decide *what* to
 * measure, never how it is printed.
 */

import type { Unit } from '../types.ts';
import { formatValue } from '../design/format.ts';

/** The compact form, which is what a sentence wants. */
export const value = (n: number, unit: Unit): string => formatValue(n, unit, { compact: true });

/** Percentage change, guarding the zero denominator. */
export function change(from: number, to: number): number | undefined {
  if (from === 0 || !Number.isFinite(from) || !Number.isFinite(to)) return undefined;
  return ((to - from) / Math.abs(from)) * 100;
}

export function share(part: number, whole: number): number {
  return whole === 0 ? 0 : (part / whole) * 100;
}

/** A gap in the metric's own units — percentage points for a ratio, otherwise a value. */
export function gap(actual: number, reference: number, unit: Unit): string {
  const difference = Math.abs(actual - reference);
  if (unit !== 'percent') return value(difference, unit);
  // Sub-percentage-point gaps read better in basis points; a CFO thinks in bp.
  return difference < 1 ? `${Math.round(difference * 100)}bp` : `${difference.toFixed(1)}pp`;
}

/** The movement in words, so the number beside it can go unsigned. */
export function direction(pct: number): string {
  if (Math.abs(pct) < 0.05) return 'flat at';
  return pct > 0 ? 'up' : 'down';
}
