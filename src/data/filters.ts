/**
 * Global filter state (PRD §12).
 *
 * Filters fold into **both** the seed and the magnitudes, because "a filter that
 * does nothing is worse than no filter, and a CEO will try one". `filterKey()`
 * feeds the A4 seed; `magnitudeScale()` and `levelOffset()` move the numbers.
 */

import type { CurrencyFilter, DivisionFilter, Filters, Unit } from '../types.ts';
import { bank } from './bank.ts';
import { branches, currencies } from './entities.ts';

export const DEFAULT_FILTERS: Filters = {
  period: '12M',
  branch: 'all',
  division: 'all',
  currency: 'all',
};

/** What each option is called, in the reader's words. */
export const PERIOD_LABEL: Readonly<Record<Filters['period'], string>> = {
  '30D': 'Last 30 days',
  LM: 'Last month',
  '3M': 'Last 3 months',
  '6M': 'Last 6 months',
  '12M': 'Last 12 months',
  '24M': 'Last 24 months',
  custom: 'Custom range',
};

/**
 * Each option as a span in **days**, which is the only unit all of them share.
 *
 * `LM` is a calendar month rather than 30 days: "last month" means August, not the trailing
 * thirty days, and resolving it to a fixed number would make it the same option as `30D`.
 * It is resolved against the as-of date in `periodWindow`.
 */
const PERIOD_DAYS: Readonly<Record<Exclude<Filters['period'], 'custom' | 'LM'>, number>> = {
  '30D': 30,
  '3M': 90,
  '6M': 182,
  '12M': 365,
  '24M': 730,
};

/** Months of history a period shows. The generated depth is always 36 (PRD §7.3). */
export const PERIOD_MONTHS: Readonly<Record<Filters['period'], number>> = {
  '30D': 1,
  LM: 1,
  '3M': 3,
  '6M': 6,
  '12M': 12,
  '24M': 24,
  custom: 12,
};

const DAY = 86_400_000;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.max(1, Math.round((Date.parse(toIso) - Date.parse(fromIso)) / DAY) + 1);
}

/** Last day of the month before the one `iso` falls in. */
function endOfPreviousMonth(iso: string): string {
  const date = new Date(iso);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0)).toISOString().slice(0, 10);
}

function startOfMonth(iso: string): string {
  const date = new Date(iso);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

/**
 * The window a filter selects: how many days, and the day it ends on.
 *
 * Every period resolves through here, so the axis builder has one thing to read and a custom
 * range is not a special case anywhere downstream.
 *
 * A custom range is **clamped to the as-of date**. There is no data after the close this
 * fixture describes, and a range running into next month would otherwise draw a flat tail
 * that looks like a business result rather than an absence of data.
 */
export function periodWindow(filters: Filters, asOf: string): { days: number; endIso: string } {
  if (filters.period === 'custom' && filters.from && filters.to) {
    const endIso = filters.to > asOf ? asOf : filters.to;
    return { days: daysBetween(filters.from, endIso), endIso };
  }
  if (filters.period === 'LM') {
    const endIso = endOfPreviousMonth(asOf);
    return { days: daysBetween(startOfMonth(endIso), endIso), endIso };
  }
  const known = filters.period === 'custom' ? '12M' : filters.period;
  return { days: PERIOD_DAYS[known as Exclude<Filters['period'], 'custom' | 'LM'>], endIso: asOf };
}

/**
 * Division shares of the bank. Declared rather than derived: a division cut needs
 * an FTP engine and a cost-allocation model (PRD Appendix A note 5). Sums to 1.
 */
export const DIVISION_SHARE: Readonly<Record<Exclude<DivisionFilter, 'all'>, number>> = {
  retail: 0.46,
  corporate: 0.41,
  treasury: 0.13,
};

/** Display names for the Division filter. */
export const DIVISIONS_LABEL: Readonly<Record<Exclude<DivisionFilter, 'all'>, string>> = {
  retail: 'Retail',
  corporate: 'Corporate',
  treasury: 'Treasury',
};

/** Part of the A4 seed, so the same filters always reproduce the same series. */
export function filterKey(filters: Filters): string {
  return `${filters.period}|${filters.branch}|${filters.division}|${filters.currency}`;
}

export function isDefaultFilters(filters: Filters): boolean {
  return filterKey(filters) === filterKey(DEFAULT_FILTERS);
}

function branchShare(branchId: string): number {
  const branch = branches.find((candidate) => candidate.id === branchId);
  if (!branch) return 1;
  return branch.deposits / bank.balanceSheet.customerDeposits;
}

function currencyShare(code: CurrencyFilter): number {
  if (code === 'all') return 1;
  if (code === 'OTHER') {
    const others = currencies.filter((currency) => currency.code !== 'IQD' && currency.code !== 'USD');
    return others.reduce((total, currency) => total + currency.deposits, 0) / bank.balanceSheet.customerDeposits;
  }
  const currency = currencies.find((candidate) => candidate.code === code);
  return currency ? currency.deposits / bank.balanceSheet.customerDeposits : 1;
}

/**
 * How much smaller a stock or flow becomes under the active filters.
 *
 * Only applies to `iqd` and `count`. A ratio does not shrink when you look at one
 * branch, so percentages use `levelOffset()` instead.
 */
export function magnitudeScale(filters: Filters, unit: Unit): number {
  if (unit === 'percent') return 1;
  let scale = 1;
  if (filters.branch !== 'all') scale *= branchShare(filters.branch);
  if (filters.division !== 'all') scale *= DIVISION_SHARE[filters.division];
  if (filters.currency !== 'all') scale *= currencyShare(filters.currency);
  return scale;
}

/**
 * Percentage-point shift applied to ratio metrics under the active filters, so a
 * percent chart visibly responds. Deterministic in the filter state.
 *
 * The magnitude is floored at 0.4pp per active dimension rather than scaled straight
 * off the draw. A raw `(draw * 2 - 1)` can land on ~0, and a filter that leaves a
 * chart pixel-identical is exactly what PRD §12 warns about — "a filter that does
 * nothing is worse than no filter". The sign still comes from the draw, so the shift
 * is as likely to be down as up.
 */
export const MIN_LEVEL_OFFSET = 0.4;
export const MAX_LEVEL_OFFSET = 1.8;

export function levelOffset(filters: Filters, draw: number): number {
  let active = 0;
  if (filters.branch !== 'all') active += 1;
  if (filters.division !== 'all') active += 1;
  if (filters.currency !== 'all') active += 1;
  if (active === 0) return 0;

  const sign = draw < 0.5 ? -1 : 1;
  const spread = Math.abs(draw * 2 - 1);
  const magnitude = MIN_LEVEL_OFFSET + spread * (MAX_LEVEL_OFFSET - MIN_LEVEL_OFFSET);
  return sign * magnitude * active;
}

/** The filter state in words, for the as-of strip (PRD §11.2). */
export function describeFilters(filters: Filters): string {
  const parts: string[] = [
    filters.period === 'custom' && filters.from && filters.to
      ? `${filters.from} to ${filters.to}`
      : PERIOD_LABEL[filters.period],
  ];
  if (filters.branch !== 'all') {
    parts.push(branches.find((branch) => branch.id === filters.branch)?.name ?? filters.branch);
  }
  if (filters.division !== 'all') {
    parts.push(`${filters.division.charAt(0).toUpperCase()}${filters.division.slice(1)}`);
  }
  if (filters.currency !== 'all') parts.push(filters.currency === 'OTHER' ? 'Other currencies' : filters.currency);
  return parts.join(' · ');
}
