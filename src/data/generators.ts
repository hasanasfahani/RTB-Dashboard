/**
 * Deterministic generation primitives.
 *
 * Everything here is seeded by a string, so a chart looks identical on every
 * reload (PRD §7.3, §16). `Math.random()` must never appear in `src/` — a chart
 * that reshuffles mid-demo destroys credibility faster than a wrong number.
 *
 * Phase 2's shape generators are built on these; this module knows nothing about
 * insights or charts.
 */

import type { Granularity, Refresh } from '../types.ts';

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------

/** cyrb53 — a fast, well-distributed string hash. */
export function hashString(value: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** mulberry32 — 32-bit PRNG, uniform in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

/**
 * The only way to obtain randomness in this application.
 *
 * A4 (plan §4): callers seed with `${id}:${panelIndex}:${filterKey}` so panels
 * within a card differ, the same panel is stable across reloads, and identical
 * filters reproduce identical output.
 */
export function seeded(seed: string): Rng {
  return mulberry32(hashString(seed));
}

/** Symmetric multiplicative noise, e.g. `noise(rng, 0.04)` for ±4%. */
export function noise(rng: Rng, amplitude: number): number {
  return 1 + (rng() * 2 - 1) * amplitude;
}

/** Uniform draw in `[min, max)`. */
export function between(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Deterministic in-place-free shuffle (Fisher-Yates over a copy). */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Numeric helpers
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Split `total` across `weights` so the parts sum to **exactly** `total`.
 *
 * Largest-remainder apportionment: the fractional shortfall goes to the entries
 * with the biggest remainders, so nothing is lost to rounding. This is what makes
 * every breakdown in `entities.ts` reconcile to the fixture (PRD §7.1), and it
 * yields the "rounded but not suspiciously round" values §7.3 asks for.
 */
export function allocate(total: number, weights: readonly number[]): number[] {
  if (weights.length === 0) return [];
  const sumWeights = weights.reduce((sum, weight) => sum + weight, 0);
  if (sumWeights <= 0) throw new Error('allocate(): weights must sum to a positive number');

  const exact = weights.map((weight) => (weight / sumWeights) * total);
  const floors = exact.map((value) => Math.floor(value));
  let remainder = total - floors.reduce((sum, value) => sum + value, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  const result = [...floors];
  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    const target = order[cursor % order.length];
    if (target) {
      result[target.index] = (result[target.index] ?? 0) + 1;
      remainder -= 1;
    }
    cursor += 1;
  }
  return result;
}

/**
 * `allocate()` at a given number of decimals.
 *
 * `allocate` apportions whole units, which is exactly right for IQD — balances are
 * exact to the dinar. It is wrong for a percentage total of ~43 across six slices:
 * the parts collapse to small integers that barely move when a filter changes the
 * total. Percent breakdowns therefore allocate at two decimals.
 */
export function allocateScaled(total: number, weights: readonly number[], decimals: number): number[] {
  if (decimals <= 0) return allocate(Math.round(total), weights);
  const factor = 10 ** decimals;
  return allocate(Math.round(total * factor), weights).map((part) => part / factor);
}

/** Decimals to apportion at, by unit. */
export function precisionFor(unit: 'iqd' | 'percent' | 'count'): number {
  return unit === 'percent' ? 2 : 0;
}

// ---------------------------------------------------------------------------
// Date axes — D1 (plan §3)
// ---------------------------------------------------------------------------

export const MONTHLY_POINTS = 36;
export const DAILY_POINTS = 90;

/**
 * D1: only insights whose `refresh` is exactly `Daily` get a daily axis. The 72
 * records reading `Daily / Monthly` are monthly, because a 90-point axis is
 * illegible on a compact card.
 */
/**
 * Whether an insight can be read day by day at all.
 *
 * 72 of the 163 are sourced `Daily / Monthly` and 6 are `Daily`; the remaining 85 are
 * `Monthly` or `Monthly / Quarterly` and genuinely have no daily figure to show. That
 * distinction is what makes a short period honest or dishonest, so it is read from the
 * catalogue rather than assumed.
 */
export function hasDailyData(refresh: Refresh): boolean {
  return refresh.startsWith('Daily');
}

/**
 * The axis an insight is drawn on, given how much history is being asked for.
 *
 * A short window switches a daily-capable insight onto a **daily** axis. Without that, asking
 * for 30 days of a monthly series returns a single point — one dot, no line — and 157 of the
 * 163 would look broken the moment the default changed.
 *
 * The switch is deliberately limited to windows of a month or less, so 3M and everything
 * above render exactly as they did before this existed.
 */
export const DAILY_WINDOW_DAYS = 31;

export function axisFor(
  refresh: Refresh,
  windowDays = Number.MAX_SAFE_INTEGER,
  /**
   * Only a time series is switched by the window.
   *
   * Every other shape reads the axis for something other than an x-axis of time — a heatmap
   * labels columns by month, a bridge counts steps — and moving them to days changes what
   * they mean rather than how much of them is shown. `Daily` refresh still forces a daily
   * axis for all shapes, exactly as it did before the Period filter grew short options.
   */
  isTimeSeries = true,
): { granularity: Granularity; points: number } {
  if (refresh === 'Daily' || (isTimeSeries && hasDailyData(refresh) && windowDays <= DAILY_WINDOW_DAYS)) {
    return { granularity: 'daily', points: DAILY_POINTS };
  }
  return { granularity: 'monthly', points: MONTHLY_POINTS };
}

function toUtc(iso: string): Date {
  const parts = iso.split('-').map(Number);
  const [year, month, day] = [parts[0] ?? 1970, parts[1] ?? 1, parts[2] ?? 1];
  return new Date(Date.UTC(year, month - 1, day));
}

function isoOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `points` month-end dates, oldest first, the last being the month-end of `endIso`. */
export function monthEndAxis(points: number, endIso: string): string[] {
  const end = toUtc(endIso);
  const dates: string[] = [];
  for (let back = points - 1; back >= 0; back -= 1) {
    // Day 0 of month+1 is the last day of that month.
    dates.push(isoOf(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - back + 1, 0))));
  }
  return dates;
}

/** `points` consecutive days, oldest first, ending on `endIso`. */
export function dayAxis(points: number, endIso: string): string[] {
  const end = toUtc(endIso);
  const dates: string[] = [];
  for (let back = points - 1; back >= 0; back -= 1) {
    dates.push(isoOf(new Date(end.getTime() - back * 86_400_000)));
  }
  return dates;
}

export function axisDates(
  refresh: Refresh,
  endIso: string,
  windowDays = Number.MAX_SAFE_INTEGER,
  isTimeSeries = true,
): string[] {
  const { granularity, points } = axisFor(refresh, windowDays, isTimeSeries);
  return granularity === 'daily' ? dayAxis(points, endIso) : monthEndAxis(points, endIso);
}

// ---------------------------------------------------------------------------
// Seasonality (PRD §7.3)
// ---------------------------------------------------------------------------

/**
 * Approximate Gregorian start of Ramadan, by year. The Islamic calendar shifts
 * ~11 days earlier annually; these are close enough for a demo and deliberately
 * not presented as authoritative. Covers the 36 months ending Aug 2026 with room
 * either side.
 */
const RAMADAN_START: Readonly<Record<number, string>> = {
  2023: '2023-03-23',
  2024: '2024-03-11',
  2025: '2025-03-01',
  2026: '2026-02-17',
  2027: '2027-02-07',
};

/**
 * Corporate volume factor: a dip through Ramadan, deeper over the Eid al-Fitr
 * week, and a smaller dip at Eid al-Adha (~70 days after Ramadan begins).
 */
export function ramadanEidFactor(iso: string): number {
  const date = toUtc(iso);
  const start = RAMADAN_START[date.getUTCFullYear()];
  if (!start) return 1;

  const dayOffset = Math.round((date.getTime() - toUtc(start).getTime()) / 86_400_000);
  if (dayOffset >= 0 && dayOffset < 30) return 0.9; // Ramadan
  if (dayOffset >= 30 && dayOffset < 37) return 0.78; // Eid al-Fitr
  if (dayOffset >= 68 && dayOffset < 74) return 0.85; // Eid al-Adha
  return 1;
}

/** Retail credit factor: month-end salary run, 25th to 28th. */
export function salarySpikeFactor(iso: string): number {
  const day = toUtc(iso).getUTCDate();
  return day >= 25 && day <= 28 ? 2.4 : 1;
}

/** Branch traffic factor: Friday is the weekend trough in Iraq. */
export function fridayTroughFactor(iso: string): number {
  return toUtc(iso).getUTCDay() === 5 ? 0.35 : 1;
}

// ---------------------------------------------------------------------------
// Series shapes
// ---------------------------------------------------------------------------

export interface TrendOptions {
  /** Number of points to produce. */
  points: number;
  /** The series ends **exactly** here — PRD §7.1: any series ends at the fixture value. */
  endValue: number;
  /** Per-period growth, e.g. `0.011` for deposits at +1.1% a month. */
  growth: number;
  /** Multiplicative noise amplitude, e.g. `0.02` for ±2%. */
  jitter?: number;
  rng: Rng;
  /**
   * Optional shape applied on top of the geometric baseline, given progress in
   * `[0, 1]`. Used for non-monotonic stories, e.g. NPL drifting up then improving.
   */
  shape?: (progress: number) => number;
  /** Floor applied after noise. Defaults to 0 — no negative balances (PRD §7.3). */
  min?: number;
}

/**
 * A trend that grows toward, and lands exactly on, `endValue`.
 *
 * Built backwards from the endpoint so the last value is never disturbed by noise,
 * which is what lets every chart reconcile to the `bank` fixture.
 */
export function trend(options: TrendOptions): number[] {
  const { points, endValue, growth, rng, shape, jitter = 0.02, min = 0 } = options;
  if (points <= 0) return [];
  if (points === 1) return [endValue];

  const values: number[] = [];
  for (let i = 0; i < points; i += 1) {
    const stepsFromEnd = points - 1 - i;
    const baseline = endValue / (1 + growth) ** stepsFromEnd;
    const shaped = shape ? baseline * shape(i / (points - 1)) : baseline;
    values.push(Math.max(min, shaped * noise(rng, jitter)));
  }
  values[points - 1] = endValue;
  return values;
}

/**
 * Logistic adoption curve rising to `endValue` (PRD §7.3: digital adoption).
 * `midpoint` and `steepness` are in progress units, `[0, 1]`.
 */
export function logistic(options: {
  points: number;
  endValue: number;
  startFraction?: number;
  midpoint?: number;
  steepness?: number;
  rng: Rng;
  jitter?: number;
}): number[] {
  const {
    points,
    endValue,
    rng,
    startFraction = 0.18,
    midpoint = 0.55,
    steepness = 9,
    jitter = 0.015,
  } = options;
  if (points <= 0) return [];
  if (points === 1) return [endValue];

  const curve = (progress: number): number => 1 / (1 + Math.exp(-steepness * (progress - midpoint)));
  const atStart = curve(0);
  const atEnd = curve(1);

  const values: number[] = [];
  for (let i = 0; i < points; i += 1) {
    const progress = i / (points - 1);
    const normalised = (curve(progress) - atStart) / (atEnd - atStart);
    const level = startFraction + (1 - startFraction) * normalised;
    values.push(Math.max(0, endValue * level * noise(rng, jitter)));
  }
  values[points - 1] = endValue;
  return values;
}

// ---------------------------------------------------------------------------
// Concentration (PRD §7.3) — the point of R-17, G-23 and C-21
// ---------------------------------------------------------------------------

/**
 * Lorenz anchors: the top 1% of customers hold 34% of deposits, the top 5% hold
 * 58%. The later anchors shape a plausible tail. Slopes decrease across the
 * anchors, so the curve is concave, as a Lorenz curve must be.
 */
const LORENZ_ANCHORS: readonly { p: number; c: number }[] = [
  { p: 0.01, c: 0.34 },
  { p: 0.05, c: 0.58 },
  { p: 0.2, c: 0.85 },
  { p: 1, c: 1 },
];

/**
 * Cumulative share held by the top `p` fraction of customers, `p` in `[0, 1]`.
 *
 * Piecewise power law through `LORENZ_ANCHORS`, so the anchor points are hit
 * exactly rather than approximated by a fitted distribution.
 */
export function concentrationCurve(p: number): number {
  const fraction = clamp(p, 0, 1);
  if (fraction <= 0) return 0;

  const first = LORENZ_ANCHORS[0] as { p: number; c: number };
  if (fraction <= first.p) {
    // Pure power law on [0, p0] so C(0) = 0, with an exponent steep enough to keep
    // the curve concave across the join.
    return first.c * (fraction / first.p) ** 0.5;
  }

  for (let i = 1; i < LORENZ_ANCHORS.length; i += 1) {
    const lower = LORENZ_ANCHORS[i - 1] as { p: number; c: number };
    const upper = LORENZ_ANCHORS[i] as { p: number; c: number };
    if (fraction <= upper.p) {
      const exponent = Math.log(upper.c / lower.c) / Math.log(upper.p / lower.p);
      return lower.c * (fraction / lower.p) ** exponent;
    }
  }
  return 1;
}

/**
 * `count` descending shares summing to exactly 1, following `concentrationCurve`.
 * Feed to `allocate()` to turn into IQD amounts that reconcile.
 */
export function concentrationWeights(count: number): number[] {
  if (count <= 0) return [];
  const weights: number[] = [];
  let previous = 0;
  for (let rank = 1; rank <= count; rank += 1) {
    const cumulative = concentrationCurve(rank / count);
    weights.push(Math.max(0, cumulative - previous));
    previous = cumulative;
  }
  return weights;
}
