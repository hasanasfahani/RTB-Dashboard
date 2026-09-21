/**
 * Every number on screen goes through this module (PRD §9, §17).
 *
 * Nothing is formatted inline anywhere else. A2 (plan §4): the per-metric delta
 * direction map lives here from the first commit, because retrofitting it means
 * auditing every KPI.
 */

import type { Unit } from '../types.ts';

const IQD = 'IQD';

/** `4.12T IQD`, `284.6B IQD`, `1.9M IQD` (PRD §9). */
export function formatIqd(value: number, options: { withUnit?: boolean } = {}): string {
  const { withUnit = true } = options;
  const suffix = withUnit ? ` ${IQD}` : '';
  const sign = value < 0 ? '−' : '';
  const magnitude = Math.abs(value);

  if (magnitude >= 1e12) return `${sign}${(magnitude / 1e12).toFixed(2)}T${suffix}`;
  if (magnitude >= 1e9) return `${sign}${(magnitude / 1e9).toFixed(1)}B${suffix}`;
  if (magnitude >= 1e6) return `${sign}${(magnitude / 1e6).toFixed(1)}M${suffix}`;
  if (magnitude >= 1e3) return `${sign}${(magnitude / 1e3).toFixed(1)}K${suffix}`;
  return `${sign}${Math.round(magnitude).toLocaleString('en-GB')}${suffix}`;
}

/** The full value with thousands separators, for tooltips (PRD §9). */
export function formatIqdFull(value: number): string {
  const sign = value < 0 ? '−' : '';
  return `${sign}${Math.round(Math.abs(value)).toLocaleString('en-GB')} ${IQD}`;
}

/** Percentages to one decimal: `18.4%`. */
export function formatPercent(value: number, decimals = 1): string {
  const sign = value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

/** Ratios to two decimals: `1.42x`. */
export function formatRatio(value: number): string {
  return `${value.toFixed(2)}x`;
}

/** Counts with separators: `268,400`. */
export function formatCount(value: number): string {
  return Math.round(value).toLocaleString('en-GB');
}

/** Dispatch on the insight's unit. */
export function formatValue(value: number, unit: Unit, options: { compact?: boolean } = {}): string {
  switch (unit) {
    case 'iqd':
      return formatIqd(value, { withUnit: !options.compact });
    case 'percent':
      return formatPercent(value);
    case 'count':
      return formatCount(value);
    default:
      return String(value);
  }
}

/** The long form, for tooltips. */
export function formatValueFull(value: number, unit: Unit): string {
  switch (unit) {
    case 'iqd':
      return formatIqdFull(value);
    case 'percent':
      return formatPercent(value, 2);
    case 'count':
      return formatCount(value);
    default:
      return String(value);
  }
}

/** Compact axis ticks — no unit suffix, minimal width. */
export function formatAxisTick(value: number, unit: Unit): string {
  if (unit === 'iqd') return formatIqd(value, { withUnit: false });
  if (unit === 'percent') return `${value.toFixed(0)}%`;
  const magnitude = Math.abs(value);
  if (magnitude >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (magnitude >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return String(Math.round(value));
}

// ---------------------------------------------------------------------------
// Deltas — A2
// ---------------------------------------------------------------------------

export type DeltaTone = 'positive' | 'negative' | 'neutral';

/**
 * Signed, with a true minus sign: `+2.4%`, `−1.1%` (PRD §9).
 * The sign is arithmetic; the *colour* is a separate question — see `deltaTone`.
 */
export function formatDelta(value: number, decimals = 1): string {
  if (value === 0) return `0.0%`;
  const sign = value > 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

/**
 * Which way is good.
 *
 * PRD §9: "encode this per metric, not per sign". `downIsGood` travels on the KPI card
 * from `anchors.ts`, so cost, NPL, CIR and impairment read green when they fall.
 */
export function deltaTone(value: number, downIsGood = false): DeltaTone {
  if (value === 0) return 'neutral';
  const rising = value > 0;
  const good = downIsGood ? !rising : rising;
  return good ? 'positive' : 'negative';
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseIso(iso: string): { year: number; month: number; day: number } | undefined {
  const parts = iso.split('-').map(Number);
  const [year, month, day] = parts;
  if (year === undefined || month === undefined || day === undefined) return undefined;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  return { year, month, day };
}

/** `31 Aug 2026`. Never `08/31/2026` (PRD §9). */
export function formatDate(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return iso;
  return `${parsed.day} ${MONTHS[parsed.month - 1] ?? ''} ${parsed.year}`;
}

/** `31 August 2026`, for the as-of strip. */
export function formatDateLong(iso: string): string {
  const long = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const parsed = parseIso(iso);
  if (!parsed) return iso;
  return `${parsed.day} ${long[parsed.month - 1] ?? ''} ${parsed.year}`;
}

/** `Aug 26` — a month-end axis tick. */
export function formatMonthTick(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return iso;
  return `${MONTHS[parsed.month - 1] ?? ''} ${String(parsed.year).slice(2)}`;
}

/** `31 Aug` — a daily axis tick. */
export function formatDayTick(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return iso;
  return `${parsed.day} ${MONTHS[parsed.month - 1] ?? ''}`;
}

/** Axis tick for whichever granularity the series carries. `ordinal` passes through. */
export function formatTimeTick(value: string, axisKind: 'monthly' | 'daily' | 'ordinal'): string {
  if (axisKind === 'ordinal') return value;
  return axisKind === 'daily' ? formatDayTick(value) : formatMonthTick(value);
}

/** Full label for a tooltip header. */
export function formatTimeLabel(value: string, axisKind: 'monthly' | 'daily' | 'ordinal'): string {
  if (axisKind === 'ordinal') return value;
  return formatDate(value);
}
