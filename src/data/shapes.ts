/**
 * The 15 shape generators that cover all 23 chart components.
 *
 * PRD §7.4 asks for ~12; these are 15 because `GeoMap`, `KpiCards` and
 * `ScenarioBars` cannot borrow another shape. Each generator takes the same
 * context and returns one `ChartData` variant. Nothing here is per-insight: the
 * variation comes from the anchor (magnitude, trend, thresholds) and the dimension
 * (categories). Bespoke work lives in `demoPath.ts`.
 *
 * Every generator must survive an empty dimension and a single-point axis, because
 * PRD §8 requires every chart to handle both.
 */

import type {
  BoxPlotGroup,
  BreakdownData,
  BreakdownSlice,
  BulletData,
  BulletRow,
  ChartData,
  DistributionData,
  Filters,
  FlowLink,
  FlowsData,
  FunnelData,
  FunnelStep,
  Gauge,
  GaugeSetData,
  GeoData,
  HistogramBin,
  Insight,
  KpiCard,
  KpiData,
  MatrixCell,
  MatrixData,
  Panel,
  RankedData,
  RankedItem,
  ScatterData,
  ScenarioData,
  TableData,
  TimeSeries,
  TimeSeriesData,
  TimeSeriesPoint,
  WaterfallData,
  WaterfallStep,
  AxisKind,
} from '../types.ts';
import { anchorsFromTitle, isDownGood, type Anchor } from './anchors.ts';
import { bank } from './bank.ts';
import { branches } from './entities.ts';
import { magnitudeScale } from './filters.ts';
import { indicatorsFor, type Dimension, type DimensionMember } from './dimensions.ts';
import {
  allocateScaled,
  between,
  clamp,
  concentrationCurve,
  logistic,
  noise,
  ramadanEidFactor,
  precisionFor,
  roundTo,
  salarySpikeFactor,
  trend,
  type Rng,
} from './generators.ts';

export interface ShapeContext {
  readonly insight: Insight;
  readonly panel: Panel;
  readonly panelIndex: number;
  readonly filters: Filters;
  readonly rng: Rng;
  readonly anchor: Anchor;
  readonly dimension: Dimension;
  /**
   * The **full** generated axis — 36 month-ends or 90 days. Series are built over
   * all of it and then sliced to `window`, so widening the Period filter reveals
   * more history without redrawing the months already on screen.
   */
  readonly axis: readonly string[];
  /** How many trailing points the Period filter shows. */
  readonly window: number;
  readonly axisKind: AxisKind;
  /**
   * Set only when the axis cannot honour the period that was asked for — a sub-monthly
   * window on a monthly-only insight. Surfaced as the panel's note, so a chart never shows
   * two months under a heading that says thirty days without saying so.
   */
  readonly spanNote?: string | undefined;
  /**
   * `anchor.growth` expressed **per axis step**, which is not the same number.
   *
   * `anchor.growth` is a rate per *month* — `monthOnMonthDelta` reads it as exactly that —
   * while `trend()` compounds its argument once per point. On a monthly axis those coincide
   * and nobody noticed. On a daily axis they do not: R-11 climbed 39.4% across thirty days
   * against 12.3% across twelve months, because each day was compounding at a month's rate.
   */
  readonly stepGrowth: number;
  /**
   * Panel 0's data, supplied when rendering panel 1.
   *
   * `KpiCards` is the second panel of 23 insights, where it summarises the chart beside
   * it. Seeded independently it produced a different number for the same measure —
   * R-01's line read 31,881 active customers while the tile next to it read 44,528.
   * A sidecar reads its values off the primary series instead.
   */
  readonly primary?: ChartData | undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function take(members: readonly DimensionMember[], count: number): readonly DimensionMember[] {
  return members.slice(0, Math.max(1, Math.min(count, members.length)));
}

/** Slices the full series down to the Period window, keeping the tail. */
function toPoints(ctx: ShapeContext, values: readonly number[]): TimeSeriesPoint[] {
  const start = Math.max(0, ctx.axis.length - ctx.window);
  return ctx.axis
    .slice(start)
    .map((t, index) => ({ t, v: roundTo(values[start + index] ?? 0, 2) }));
}

/** Seasonality applies only on a daily axis, where it is actually visible (PRD §7.3). */
function seasonalise(ctx: ShapeContext, values: readonly number[]): number[] {
  if (ctx.axisKind !== 'daily') return [...values];
  const isCorporate = ctx.insight.layer === 'corporate';
  const isRetailCredit = /salary|credit|inflow|transaction|payment/.test(ctx.insight.title.toLowerCase());
  return values.map((value, index) => {
    const iso = ctx.axis[index];
    if (!iso) return value;
    let factor = 1;
    if (isCorporate) factor *= ramadanEidFactor(iso);
    if (isRetailCredit) factor *= salarySpikeFactor(iso);
    return value * factor;
  });
}

function buildSeriesValues(ctx: ShapeContext, endValue: number, anchor: Anchor): number[] {
  const points = ctx.axis.length;
  const raw = anchor.logistic
    ? logistic({ points, endValue, rng: ctx.rng, jitter: anchor.jitter })
    : trend({
        points,
        endValue,
        // Per axis step, not per month — see `stepGrowth`.
        growth: ctx.stepGrowth,
        jitter: anchor.jitter,
        rng: ctx.rng,
        min: anchor.min,
        ...(anchor.shape ? { shape: anchor.shape } : {}),
      });
  const seasonal = seasonalise(ctx, raw);
  // The endpoint must survive seasonality, or the chart stops reconciling.
  if (seasonal.length > 0) seasonal[seasonal.length - 1] = endValue;
  return seasonal.map((value) =>
    clamp(value, anchor.min, anchor.max ?? Number.MAX_SAFE_INTEGER),
  );
}

function referenceOf(anchor: Anchor): Pick<ChartData, 'reference' | 'note'> {
  return {
    ...(anchor.reference.length > 0 ? { reference: anchor.reference } : {}),
    ...(anchor.note ? { note: anchor.note } : {}),
  };
}

// ---------------------------------------------------------------------------
// 1. timeSeries — LineChart, AreaChart, ComboChart, StackedBar, VintageCurves
// ---------------------------------------------------------------------------

export function timeSeriesShape(ctx: ShapeContext): TimeSeriesData {
  const { insight, panel, anchor, dimension, rng } = ctx;
  const { component, variant } = panel;

  // How many series, and what they mean, is entirely a function of the component.
  if (component === 'VintageCurves') {
    return vintageShape(ctx);
  }

  if (component === 'StackedBar' || (component === 'AreaChart' && variant === 'stacked')) {
    const members = take(dimension.members, 6);
    // A stacked composition in percent is a 100% split by definition — stacking
    // shares that sum to the anchor's 42.6% would be meaningless.
    const stackTotal = insight.unit === 'percent' ? 100 : anchor.level;
    const endpoints = allocateScaled(
      stackTotal,
      members.map((member) => member.weight),
      precisionFor(insight.unit),
    );
    /*
     * A component of a composition is bounded by the composition, not by the metric.
     * Clamping Stage 1's 84%-of-100 share to the NPL metric's 30% ceiling pinned the
     * series flat at 30 — so the bound is relaxed here.
     */
    const stackAnchor: Anchor = {
      ...anchor,
      min: 0,
      max: insight.unit === 'percent' ? 100 : undefined,
    };
    const series: TimeSeries[] = members.map((member, index) => ({
      key: member.key,
      label: member.label,
      points: toPoints(ctx, buildSeriesValues(ctx, endpoints[index] ?? 0, stackAnchor)),
      role: component === 'StackedBar' ? 'bar' : 'area',
    }));
    return {
      shape: 'timeSeries',
      unit: insight.unit,
      axisKind: ctx.axisKind,
      series,
      stacked: true,
      ...(variant === 'percent' ? { normalised: true } : {}),
      ...referenceOf(anchor),
    };
  }

  if (component === 'ComboChart') {
    const metrics = anchorsFromTitle(insight, ctx.filters, rng, 2);
    const primary = metrics[0] ?? anchor;
    const secondary = metrics[1] ?? { ...anchor, label: `${anchor.label} trend`, level: anchor.level * 0.42 };
    const dual = variant === 'dualAxisLines';
    return {
      shape: 'timeSeries',
      unit: insight.unit,
      axisKind: ctx.axisKind,
      series: [
        {
          key: 'primary',
          label: primary.label,
          points: toPoints(ctx, buildSeriesValues(ctx, primary.level, primary)),
          role: dual ? 'line' : 'bar',
          axis: 'left',
        },
        {
          key: 'secondary',
          label: secondary.label,
          points: toPoints(ctx, buildSeriesValues(ctx, secondary.level, secondary)),
          role: 'line',
          axis: dual ? 'right' : 'left',
        },
      ],
      ...referenceOf(primary),
    };
  }

  // LineChart and AreaChart:single — one series, with variant-specific references.
  const reference = [...anchor.reference];
  if (variant === 'appetiteBand') {
    const half = Math.max(anchor.level * 0.12, 0.4);
    reference.push({
      label: 'Risk appetite',
      value: roundTo(anchor.level - half, 2),
      kind: 'band',
      upper: roundTo(anchor.level + half, 2),
    });
  }

  const values = buildSeriesValues(ctx, anchor.level, anchor);
  return {
    shape: 'timeSeries',
    unit: insight.unit,
    axisKind: ctx.axisKind,
    series: [{ key: 'primary', label: anchor.label, points: toPoints(ctx, values), role: 'line' }],
    ...(reference.length > 0 ? { reference } : {}),
    ...(anchor.note ? { note: anchor.note } : {}),
  };
}

/**
 * `VintageCurves` (R-45) plots default rate against months-on-book, one curve per
 * origination cohort — so the axis is ordinal, not a date.
 */
function vintageShape(ctx: ShapeContext): TimeSeriesData {
  const { insight, anchor, rng } = ctx;
  const monthsOnBook = 18;
  const axis = Array.from({ length: monthsOnBook }, (_, index) => `M${index}`);
  const cohorts = ['2024 H2', '2025 H1', '2025 H2', '2026 H1'];

  const series: TimeSeries[] = cohorts.map((label, cohortIndex) => {
    // Later cohorts season less far and, here, a little worse.
    const visible = monthsOnBook - cohortIndex * 4;
    const terminal = anchor.level * (0.72 + cohortIndex * 0.14);
    const points: TimeSeriesPoint[] = [];
    for (let month = 0; month < visible; month += 1) {
      const maturity = 1 - Math.exp(-month / 5.5);
      points.push({ t: axis[month] ?? `M${month}`, v: roundTo(terminal * maturity * noise(rng, 0.06), 2) });
    }
    return { key: `cohort-${cohortIndex}`, label, points, role: 'line' };
  });

  return {
    shape: 'timeSeries',
    unit: insight.unit,
    axisKind: 'ordinal',
    series,
    ...referenceOf(anchor),
  };
}

// ---------------------------------------------------------------------------
// 2. breakdown — DonutChart, Treemap, StackedBar:ladder
// ---------------------------------------------------------------------------

export function breakdownShape(ctx: ShapeContext): BreakdownData {
  const { insight, panel, anchor, dimension, rng } = ctx;
  const isLadder = panel.variant === 'ladder';
  const members = take(dimension.members, isLadder ? 7 : 6);
  const precision = precisionFor(insight.unit);
  const values = allocateScaled(anchor.level, members.map((member) => member.weight), precision);

  const slices: BreakdownSlice[] = members.map((member, index) => {
    const value = values[index] ?? 0;
    if (!isLadder) return { key: member.key, label: member.label, value };

    // A ladder bucket is itself stacked — assets vs liabilities, or drawn vs undrawn.
    const [assetsLabel, liabilitiesLabel] = /collateral/.test(insight.title.toLowerCase())
      ? (['Secured', 'Unsecured'] as const)
      : (['Assets', 'Liabilities'] as const);
    const split = clamp(between(rng, 0.38, 0.62), 0.2, 0.8);
    const first = roundTo(value * split, precision);
    return {
      key: member.key,
      label: member.label,
      value,
      parts: [
        { key: 'a', label: assetsLabel, value: first },
        { key: 'b', label: liabilitiesLabel, value: value - first },
      ],
    };
  });

  return {
    shape: 'breakdown',
    unit: insight.unit,
    total: slices.reduce((sum, slice) => sum + slice.value, 0),
    slices,
    ...(isLadder ? { bucketLabel: dimension.label } : {}),
    ...referenceOf(anchor),
  };
}

// ---------------------------------------------------------------------------
// 3. ranked — BarChart, RankedBar, ParetoChart
// ---------------------------------------------------------------------------

export function rankedShape(ctx: ShapeContext): RankedData {
  const { insight, panel, anchor, dimension } = ctx;

  if (panel.variant === 'lorenz') return lorenzShape(ctx);

  const isPareto = panel.component === 'ParetoChart';
  // Top-N depositor and funding concentration (G-23, C-21 and friends) must follow
  // the PRD §7.3 concentration curve, not the dimension's own weights — otherwise
  // the point of the chart is lost.
  if (isPareto && /top[- ]?\d*\s*(depositor|customer|client|borrower)|concentration|funding concentration/.test(insight.title.toLowerCase())) {
    return topNConcentrationShape(ctx);
  }
  const members = take(dimension.members, isPareto ? 10 : 8);
  const values = allocateScaled(
    anchor.level,
    members.map((member) => member.weight),
    precisionFor(insight.unit),
  );

  const ordered = members
    .map((member, index) => ({ member, value: values[index] ?? 0 }))
    .sort((a, b) => b.value - a.value);

  const total = ordered.reduce((sum, entry) => sum + entry.value, 0);
  let running = 0;
  const items: RankedItem[] = ordered.map(({ member, value }) => {
    running += value;
    return {
      key: member.key,
      label: member.label,
      value,
      cumulativePct: total > 0 ? roundTo((running / total) * 100, 2) : 0,
    };
  });

  const reference = [...anchor.reference];
  if (isPareto) {
    reference.push({ label: '80% of total', value: 80, kind: 'target' });
  }

  return {
    shape: 'ranked',
    unit: insight.unit,
    total,
    items,
    ...(reference.length > 0 ? { reference } : {}),
    ...(anchor.note ? { note: anchor.note } : {}),
  };
}

/**
 * Top-10 named counterparties plus an "all others" tail, sized from the same
 * concentration curve as the Lorenz view so R-17, G-23 and C-21 tell one story.
 */
function topNConcentrationShape(ctx: ShapeContext): RankedData {
  const { insight, anchor, rng } = ctx;
  const named = 10;
  const topShare = concentrationCurve(0.05);
  const topTotal = roundTo(anchor.level * topShare, precisionFor(insight.unit));

  const weights = Array.from({ length: named }, (_, rank) => 1 / (rank + 1) ** 0.85 * noise(rng, 0.05));
  const values = allocateScaled(topTotal, weights, precisionFor(insight.unit));

  let running = 0;
  const items: RankedItem[] = values.map((value, index) => {
    running += value;
    return {
      key: `counterparty-${index + 1}`,
      label: `Counterparty ${index + 1}`,
      value,
      cumulativePct: roundTo((running / anchor.level) * 100, 2),
    };
  });
  items.push({
    key: 'others',
    label: 'All others',
    value: roundTo(anchor.level - topTotal, precisionFor(insight.unit)),
    cumulativePct: 100,
  });

  return {
    shape: 'ranked',
    unit: insight.unit,
    total: anchor.level,
    items,
    reference: [{ label: 'Top 5% hold 58%', value: 58, kind: 'target' }],
    ...(anchor.note ? { note: anchor.note } : {}),
  };
}

/**
 * `ParetoChart:lorenz` — R-17, the deposit concentration curve. The x axis is a
 * share of the customer base, not a category, and the curve passes exactly through
 * the PRD §7.3 anchors: top 1% hold 34%, top 5% hold 58%.
 */
function lorenzShape(ctx: ShapeContext): RankedData {
  const { insight, anchor, filters } = ctx;
  // Scales with the filters, so the curve states what it is computed over.
  const customerBase = Math.round(
    (bank.base.retailCustomers + bank.base.corporateCustomers) * magnitudeScale(filters, 'count'),
  );
  const stops = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.65, 0.8, 1];
  let previousCumulative = 0;
  const items: RankedItem[] = stops.map((stop) => {
    const cumulative = concentrationCurve(stop);
    const slice = cumulative - previousCumulative;
    previousCumulative = cumulative;
    return {
      key: `p${Math.round(stop * 100)}`,
      label: `Top ${roundTo(stop * 100, 0)}%`,
      value: roundTo(anchor.level * slice, precisionFor(insight.unit)),
      cumulativePct: roundTo(cumulative * 100, 2),
    };
  });

  return {
    shape: 'ranked',
    unit: insight.unit,
    total: anchor.level,
    items,
    lorenz: true,
    basis: { label: 'customers', value: customerBase, unit: 'count' },
    reference: [
      { label: 'Top 1% hold 34%', value: 34, kind: 'target' },
      { label: 'Top 5% hold 58%', value: 58, kind: 'target' },
    ],
  };
}

// ---------------------------------------------------------------------------
// 4. matrix — Heatmap (intensity, rag, cohort)
// ---------------------------------------------------------------------------

export function matrixShape(ctx: ShapeContext): MatrixData {
  const { insight, panel, anchor, dimension, rng } = ctx;

  if (panel.variant === 'cohort') return cohortShape(ctx);
  if (panel.variant === 'rag') return ragShape(ctx);

  const title = insight.title.toLowerCase();
  const rows = take(dimension.members, 8).map((member) => member.label);

  /*
   * "hour x day" (R-35) is the one intensity heatmap that is not category x month.
   *
   * The month labels are taken from the axis, and `iso.slice(0, 7)` collapses a date to
   * `YYYY-MM` — which on a **daily** axis makes twelve consecutive days into twelve identical
   * column keys. React then warns about duplicate keys once per row, and the chart draws one
   * column of the twelve. R-35 is `Daily` refresh, so this was live before the Period filter
   * ever offered a short window; the filter only made it reachable on more insights.
   */
  const cols = /hour|peak/.test(title)
    ? ['00–04', '04–08', '08–12', '12–16', '16–20', '20–24']
    : ctx.axis
        .slice(-Math.min(12, ctx.axis.length))
        .map((iso) => (ctx.axisKind === 'daily' ? iso : iso.slice(0, 7)));

  const cells: MatrixCell[] = [];
  const perCell = rows.length > 0 && cols.length > 0 ? anchor.level / (rows.length * cols.length) : 0;
  for (const row of rows) {
    for (const col of cols) {
      cells.push({ row, col, value: roundTo(Math.max(0, perCell * noise(rng, 0.55)), 2) });
    }
  }

  return {
    shape: 'matrix',
    unit: insight.unit,
    rows,
    cols,
    cells,
    rowLabel: dimension.label,
    colLabel: /hour|peak/.test(title) ? 'Time of day' : 'Month',
    ...referenceOf(anchor),
  };
}

/**
 * `Heatmap:rag` is the traffic-light panel — D2 dropped `TrafficLightPanel`, and
 * these four insights are what it would have rendered.
 */
function ragShape(ctx: ShapeContext): MatrixData {
  const { insight, anchor, dimension, rng } = ctx;
  // An early-warning or covenant panel lists indicators, not products — the inferred
  // dimension would label the rows "Current account", "Savings account", ...
  const indicators = indicatorsFor(insight.title);
  const rows = (indicators ?? take(dimension.members, 6).map((member) => member.label)).slice(0, 6);
  const cols = ['Current', 'Prior month', 'Limit'];

  const cells: MatrixCell[] = [];
  for (const row of rows) {
    for (const col of cols) {
      const draw = rng();
      const status = draw > 0.78 ? 'red' : draw > 0.55 ? 'amber' : 'green';
      cells.push({
        row,
        col,
        value: roundTo(anchor.level * between(rng, 0.55, 1.15) / Math.max(1, rows.length), 2),
        status,
      });
    }
  }

  return {
    shape: 'matrix',
    unit: insight.unit,
    rows,
    cols,
    cells,
    rowLabel: indicators ? 'Indicator' : dimension.label,
    colLabel: 'Status',
    ...referenceOf(anchor),
  };
}

/** `Heatmap:cohort` (R-06) — triangular, because later cohorts have fewer periods. */
function cohortShape(ctx: ShapeContext): MatrixData {
  const { insight, anchor, rng } = ctx;
  const cohortCount = 8;
  const rows = ctx.axis.slice(-cohortCount).map((iso) => iso.slice(0, 7));
  const cols = Array.from({ length: cohortCount }, (_, index) => `M${index}`);

  const cells: MatrixCell[] = [];
  rows.forEach((row, rowIndex) => {
    const periods = cohortCount - rowIndex;
    for (let month = 0; month < periods; month += 1) {
      // Retention decays and never rises.
      const retention = 100 * Math.exp(-month / 9) * noise(rng, 0.04);
      cells.push({ row, col: cols[month] ?? `M${month}`, value: roundTo(clamp(retention, 0, 100), 2) });
    }
  });

  return {
    shape: 'matrix',
    unit: insight.unit,
    rows,
    cols,
    cells,
    rowLabel: 'Cohort',
    colLabel: 'Months on book',
    ...referenceOf(anchor),
  };
}

// ---------------------------------------------------------------------------
// 5. funnelSteps — FunnelChart
// ---------------------------------------------------------------------------

const FUNNELS: readonly { test: RegExp; steps: readonly string[] }[] = [
  { test: /aml|alert|suspicious|\bstr\b/, steps: ['Alerts raised', 'Triaged', 'Investigated', 'Escalated', 'STRs filed'] },
  { test: /onboard|digital onboarding/, steps: ['Started', 'Identity verified', 'KYC passed', 'Funded', 'Activated'] },
  { test: /\blc\b|letter of credit|utilisation|expiry/, steps: ['Issued', 'Advised', 'Documents presented', 'Drawn', 'Settled'] },
  { test: /application|approved|disbursed/, steps: ['Applied', 'Screened', 'Approved', 'Disbursed'] },
];

const DEFAULT_FUNNEL = ['Lead', 'Application', 'KYC', 'Account opened', 'Activated'] as const;

export function funnelShape(ctx: ShapeContext): FunnelData {
  const { insight, anchor, rng } = ctx;
  const title = insight.title.toLowerCase();
  const labels = FUNNELS.find((entry) => entry.test.test(title))?.steps ?? DEFAULT_FUNNEL;

  const steps: FunnelStep[] = [];
  let value = anchor.level;
  labels.forEach((label, index) => {
    const conversion = index === 0 ? 100 : roundTo(between(rng, 62, 91), 1);
    value = index === 0 ? value : Math.max(1, Math.round((value * conversion) / 100));
    steps.push({ key: `step-${index}`, label, value, conversionPct: conversion });
  });

  return { shape: 'funnelSteps', unit: insight.unit, steps, ...referenceOf(anchor) };
}

// ---------------------------------------------------------------------------
// 6. distribution — Histogram, BoxPlot
// ---------------------------------------------------------------------------

export function distributionShape(ctx: ShapeContext): DistributionData {
  const { insight, panel, anchor, dimension, rng } = ctx;
  const overlay = panel.variant === 'overlay';
  const seriesLabels = overlay ? ['New book', 'Existing book'] : [anchor.label];

  const binCount = 10;
  const upper = Math.max(anchor.level * 2.4, 1);
  const width = upper / binCount;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, index) => {
    const from = roundTo(index * width, 2);
    const to = roundTo((index + 1) * width, 2);
    // A right-skewed hump, which is what balances and scores actually look like.
    const centre = (index + 0.5) / binCount;
    const density = Math.exp(-((centre - 0.38) ** 2) / 0.06);
    const counts = seriesLabels.map((_, seriesIndex) => {
      const shift = seriesIndex === 0 ? 1 : 0.82;
      return Math.max(0, Math.round(density * shift * 1_000 * noise(rng, 0.14)));
    });
    return { from, to, counts };
  });

  // BoxPlot needs five-number summaries per group rather than bins.
  const groups: BoxPlotGroup[] = take(dimension.members, 5).map((member) => {
    const median = anchor.level * between(rng, 0.62, 1.42);
    const spread = median * between(rng, 0.22, 0.44);
    const q1 = Math.max(anchor.min, median - spread);
    const q3 = median + spread;
    return {
      key: member.key,
      label: member.label,
      min: roundTo(Math.max(anchor.min, q1 - spread * 1.4), 2),
      q1: roundTo(q1, 2),
      median: roundTo(median, 2),
      q3: roundTo(q3, 2),
      max: roundTo(q3 + spread * 1.6, 2),
    };
  });

  return {
    shape: 'distribution',
    unit: insight.unit,
    seriesLabels,
    bins,
    groups,
    valueLabel: anchor.label,
    ...referenceOf(anchor),
  };
}

// ---------------------------------------------------------------------------
// 7. flows — SankeyDiagram
// ---------------------------------------------------------------------------

export function flowsShape(ctx: ShapeContext): FlowsData {
  const { insight, anchor, dimension, rng } = ctx;
  const title = insight.title.toLowerCase();

  // Transition flows (roll rates, rating migration) go bucket -> bucket.
  const isTransition = /roll[- ]rate|migration|delinquen/.test(title);
  const sources = take(dimension.members, isTransition ? 4 : 3);
  const targets = isTransition
    ? take(dimension.members, 5).slice(1)
    : take(dimension.members, 6).slice(sources.length, sources.length + 4);

  const nodeTargets = targets.length > 0 ? targets : take(dimension.members, 3);

  const nodes = [
    ...sources.map((member) => ({ id: `src-${member.key}`, label: member.label })),
    ...nodeTargets.map((member) => ({ id: `dst-${member.key}`, label: member.label })),
  ];

  const precision = precisionFor(insight.unit);
  const sourceTotals = allocateScaled(anchor.level, sources.map((member) => member.weight), precision);
  const links: FlowLink[] = [];
  sources.forEach((source, sourceIndex) => {
    const total = sourceTotals[sourceIndex] ?? 0;
    const weights = nodeTargets.map(() => between(rng, 0.4, 2.6));
    const split = allocateScaled(total, weights, precision);
    nodeTargets.forEach((target, targetIndex) => {
      const value = split[targetIndex] ?? 0;
      if (value > 0) links.push({ from: `src-${source.key}`, to: `dst-${target.key}`, value });
    });
  });

  return { shape: 'flows', unit: insight.unit, nodes, links, ...referenceOf(anchor) };
}

// ---------------------------------------------------------------------------
// 8. scatterPoints — ScatterPlot
// ---------------------------------------------------------------------------

export function scatterShape(ctx: ShapeContext): ScatterData {
  const { insight, panel, anchor, dimension, rng } = ctx;
  const title = insight.title.toLowerCase();

  const [xLabel, yLabel] = /cost.*revenue|cost[- ]to[- ]serve/.test(title)
    ? (['Cost to serve', 'Revenue per customer'] as const)
    : /risk.*return|raroc/.test(title)
      ? (['Risk weight', 'RAROC'] as const)
      : /rating.*yield|pricing/.test(title)
        ? (['Risk grade', 'Yield'] as const)
        : /beta|pass[- ]through/.test(title)
          ? (['Δ policy rate', 'Δ deposit rate'] as const)
          : (['Volume', anchor.label] as const);

  const members = dimension.members.length > 0 ? dimension.members : [{ key: 'a', label: 'A', weight: 1 }];
  const points = members.slice(0, 24).map((member) => {
    const x = anchor.level * between(rng, 0.25, 1.75);
    // Correlated, not random noise — a cloud with no relationship looks synthetic.
    const y = x * between(rng, 0.55, 1.5);
    return {
      key: member.key,
      label: member.label,
      x: roundTo(x, 2),
      y: roundTo(y, 2),
      size: roundTo(member.weight, 2),
    };
  });

  const meanX = points.reduce((sum, point) => sum + point.x, 0) / Math.max(1, points.length);
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / Math.max(1, points.length);

  return {
    shape: 'scatterPoints',
    unit: insight.unit,
    points,
    xLabel,
    yLabel,
    ...(panel.variant === 'quadrant' || panel.variant === 'breakEven'
      ? { quadrantX: roundTo(meanX, 2), quadrantY: roundTo(meanY, 2) }
      : {}),
    ...referenceOf(anchor),
  };
}

// ---------------------------------------------------------------------------
// 9. gaugeSet — GaugeChart
// ---------------------------------------------------------------------------

export function gaugeShape(ctx: ShapeContext): GaugeSetData {
  const { insight, filters, rng } = ctx;
  const anchors = anchorsFromTitle(insight, filters, rng, 3);

  const gauges: Gauge[] = anchors.map((anchor, index) => {
    const target = anchor.reference.find((reference) => reference.kind === 'target')?.value;
    const floor = anchor.reference.find((reference) => reference.kind === 'floor')?.value;
    const max = anchor.max ?? Math.max(anchor.level * 1.6, 1);
    return {
      key: `gauge-${index}`,
      label: anchor.label,
      value: roundTo(anchor.level, 2),
      min: anchor.min,
      max: roundTo(max, 2),
      ...(target !== undefined ? { target } : {}),
      downIsGood: anchor.downIsGood,
      // Only real floors. PRD §8 says a floor is always labelled, so inventing one
      // for a metric that has none (LDR) would put a false regulatory line on screen.
      ...(floor !== undefined ? { floor } : {}),
    };
  });

  const first = anchors[0];
  return {
    shape: 'gaugeSet',
    unit: insight.unit,
    gauges,
    ...(first?.note ? { note: first.note } : {}),
  };
}

// ---------------------------------------------------------------------------
// 10. bulletRows — BulletChart
// ---------------------------------------------------------------------------

export function bulletShape(ctx: ShapeContext): BulletData {
  const { insight, filters, rng } = ctx;
  const anchors = anchorsFromTitle(insight, filters, rng, 4);

  const rows: BulletRow[] = anchors.map((anchor, index) => {
    const target = anchor.reference.find((reference) => reference.kind === 'target')?.value ?? anchor.level * 1.08;
    const ceiling = Math.max(anchor.level, target) * 1.3;
    return {
      key: `row-${index}`,
      label: anchor.label,
      value: roundTo(anchor.level, 2),
      target: roundTo(target, 2),
      ranges: [roundTo(ceiling * 0.5, 2), roundTo(ceiling * 0.8, 2), roundTo(ceiling, 2)],
    };
  });

  const first = anchors[0];
  return {
    shape: 'bulletRows',
    unit: insight.unit,
    rows,
    ...(first?.note ? { note: first.note } : {}),
  };
}

// ---------------------------------------------------------------------------
// 11. tableRows — DataTable:exception
// ---------------------------------------------------------------------------

export function tableShape(ctx: ShapeContext): TableData {
  const { insight, anchor, dimension, rng } = ctx;
  // An exception report over named indicators reads far better than one over
  // "Category A, Category B" — same reasoning as the RAG panels.
  const indicators = indicatorsFor(insight.title);
  const members = indicators
    ? indicators.map((label, index) => ({ key: `indicator-${index}`, label, weight: indicators.length - index }))
    : take(dimension.members, 8);

  const columns = [
    { key: 'name', label: indicators ? 'Indicator' : dimension.label, align: 'start' as const },
    { key: 'value', label: anchor.label, align: 'end' as const, unit: insight.unit },
    { key: 'variance', label: 'vs limit', align: 'end' as const, unit: 'percent' as const },
    { key: 'status', label: 'Status', align: 'start' as const },
  ];

  const flagged: string[] = [];
  const rows = members.map((member, index) => {
    const variance = roundTo(between(rng, -22, 34), 1);
    const breach = variance > 12;
    if (breach) flagged.push(member.key);
    return {
      key: member.key,
      name: member.label,
      value: roundTo(anchor.level * between(rng, 0.2, 1.1) / Math.max(1, index + 1), 2),
      variance,
      status: breach ? 'Breach' : variance > 0 ? 'Watch' : 'Within limit',
    };
  });

  return {
    shape: 'tableRows',
    unit: insight.unit,
    columns,
    rows,
    ...(flagged.length > 0 ? { flagged } : {}),
    ...referenceOf(anchor),
  };
}

// ---------------------------------------------------------------------------
// 12. waterfallSteps — WaterfallChart
// ---------------------------------------------------------------------------

export function waterfallShape(ctx: ShapeContext): WaterfallData {
  const { insight, anchor, dimension, rng } = ctx;
  const title = insight.title.toLowerCase();

  // A P&L bridge is the one waterfall worth building from the real income lines.
  // Only for IQD insights: a percent-unit "P&L contribution" is a share, not a bridge.
  if (insight.unit === 'iqd' && /p&l|profit|budget vs actual|variance|income statement/.test(title)) {
    const lines = bank.incomeMonthly;
    // Scaled so the bridge narrows with the branch, division and currency filters.
    const scale = magnitudeScale(ctx.filters, insight.unit);
    const at = (value: number): number => Math.round(value * scale);
    const steps: WaterfallStep[] = [
      { key: 'nii', label: 'Net interest income', value: at(bank.income.netInterestIncome), kind: 'start' },
      { key: 'fees', label: 'Fees & commissions', value: at(lines.feesAndCommissions), kind: 'delta' },
      { key: 'fx', label: 'FX & trading', value: at(lines.fxAndTrading), kind: 'delta' },
      { key: 'opex', label: 'Operating expenses', value: at(lines.operatingExpenses), kind: 'delta' },
      { key: 'impairment', label: 'Impairment', value: at(lines.impairmentCharge), kind: 'delta' },
      { key: 'tax', label: 'Tax', value: at(lines.taxExpense), kind: 'delta' },
      {
        key: 'net',
        label: 'Net profit',
        // Derived from the steps so the bridge always closes, even after rounding.
        value:
          at(bank.income.netInterestIncome) + at(lines.feesAndCommissions) + at(lines.fxAndTrading) +
          at(lines.operatingExpenses) + at(lines.impairmentCharge) + at(lines.taxExpense),
        kind: 'total',
      },
    ];
    return { shape: 'waterfallSteps', unit: insight.unit, steps };
  }

  const members = take(dimension.members, 5);
  const places = precisionFor(insight.unit);
  const opening = roundTo(anchor.level / (1 + ctx.stepGrowth) ** Math.max(1, ctx.axis.length - 1), places);
  const closing = roundTo(anchor.level, places);
  const movement = closing - opening;

  // Gross flows, then signs — not a partition of the net change.
  //
  // Two bugs lived in the obvious version. Splitting |movement| across the members and
  // then flipping some signs at random means the bars no longer sum to the movement, so
  // the bridge does not close: R-48's deltas landed 37.6% short of the closing bar it
  // was drawn against. And a metric whose anchor is flat has no movement to split, so
  // G-32 — "NPL formation & cures" — drew five deltas of exactly zero between an opening
  // and a closing bar of the same height.
  //
  // Both go away by building what a bridge actually is: gross activity in each direction
  // that happens to net to the movement. A book that ends the year where it started
  // still formed and cured loans all year.
  const gross = Math.max(Math.abs(closing) * between(rng, 0.16, 0.28), Math.abs(movement) * 1.4);
  // P - N = movement and P + N = gross, so the deltas reproduce the movement exactly.
  const risingPot = (gross + movement) / 2;
  const fallingPot = (gross - movement) / 2;

  // At least one member in each direction whenever there is more than one, so the bridge
  // has a down bar to explain rather than a staircase.
  const rising = members.map((_member, index) => (index === 0 ? true : index === 1 ? false : rng() > 0.45));
  const potFor = (up: boolean): number => (up ? risingPot : fallingPot);
  const shareOf = (up: boolean): number[] => {
    const weights = members.map((member, index) => (rising[index] === up ? member.weight : 0));
    const sum = weights.reduce((total, weight) => total + weight, 0);
    return sum > 0 ? allocateScaled(potFor(up), weights, places) : weights;
  };
  const up = shareOf(true);
  const down = shareOf(false);

  const deltas = members.map((_member, index) =>
    rising[index] ? (up[index] ?? 0) : -(down[index] ?? 0),
  );

  // Rounding inside the two pots can leave a unit or two over; the largest mover absorbs
  // it, which keeps `opening + deltas === closing` true of the numbers actually drawn.
  const residual = roundTo(movement - deltas.reduce((total, delta) => total + delta, 0), places);
  if (residual !== 0 && deltas.length > 0) {
    let largest = 0;
    for (let index = 1; index < deltas.length; index += 1) {
      if (Math.abs(deltas[index] ?? 0) > Math.abs(deltas[largest] ?? 0)) largest = index;
    }
    deltas[largest] = roundTo((deltas[largest] ?? 0) + residual, places);
  }

  const steps: WaterfallStep[] = [
    { key: 'opening', label: 'Opening', value: opening, kind: 'start' },
    ...members.map((member, index) => ({
      key: member.key,
      label: member.label,
      value: deltas[index] ?? 0,
      kind: 'delta' as const,
    })),
    { key: 'closing', label: 'Closing', value: closing, kind: 'total' },
  ];

  return { shape: 'waterfallSteps', unit: insight.unit, steps, ...referenceOf(anchor) };
}

// ---------------------------------------------------------------------------
// 13. geoPoints — GeoMap:iraqBranches
// ---------------------------------------------------------------------------

export function geoShape(ctx: ShapeContext): GeoData {
  const { insight, anchor } = ctx;
  // Branch geography comes straight from the fixture, so the map reconciles.
  const weights = branches.map((branch) =>
    insight.unit === 'count' ? branch.retailCustomers : branch.deposits,
  );
  const values = allocateScaled(anchor.level, weights, precisionFor(insight.unit));

  return {
    shape: 'geoPoints',
    unit: insight.unit,
    points: branches.map((branch, index) => ({
      id: branch.id,
      label: branch.name,
      lon: branch.lon,
      lat: branch.lat,
      value: values[index] ?? 0,
    })),
    ...referenceOf(anchor),
  };
}

// ---------------------------------------------------------------------------
// 14. kpiSet — KpiCards
// ---------------------------------------------------------------------------

/**
 * Month-on-month change taken from the **trend**, not from the last two plotted
 * points.
 *
 * A ±3% noise band swamps a +1.1%/month trend, so differencing two noisy points gave
 * the headline band deltas like "Customer deposits -0.12%" on a screen whose story is
 * growth. The direction has to match the narrative, so the delta comes from the
 * anchor's own growth (or its shape, where the shape is the story) with a modest
 * seeded spread for variety.
 */
function monthOnMonthDelta(ctx: ShapeContext, anchor: Anchor): number {
  const points = Math.max(2, ctx.axis.length);
  const step = 1 / (points - 1);
  let base = anchor.growth;

  if (anchor.shape) {
    const atEnd = anchor.shape(1);
    const atPrevious = anchor.shape(1 - step);
    if (atPrevious !== 0) base = (1 + anchor.growth) * (atEnd / atPrevious) - 1;
  } else if (anchor.logistic) {
    // A logistic curve is flattening by the end, so the last step is small.
    base = Math.max(anchor.growth, 0.004);
  }

  const spread = 0.85 + ctx.rng() * 0.3;
  return roundTo(base * spread * 100, 2);
}

export function kpiShape(ctx: ShapeContext): KpiData {
  const { insight, panel, filters, rng } = ctx;
  const withSpark = panel.variant === 'sparkline';

  // A sidecar summarises the primary chart, so it takes its numbers from it.
  if (ctx.panelIndex > 0 && ctx.primary?.shape === 'timeSeries') {
    const source = ctx.primary;
    const cards: KpiCard[] = source.series.slice(0, 4).map((series, index) => {
      const points = series.points;
      const last = points.at(-1)?.v ?? 0;
      const previous = points.at(-2)?.v;
      const deltaPct =
        previous !== undefined && previous !== 0 ? roundTo(((last - previous) / previous) * 100, 2) : 0;
      return {
        key: `kpi-${index}`,
        label: series.label,
        value: roundTo(last, 2),
        unit: source.unit,
        deltaPct,
        downIsGood: isDownGood(insight),
        ...(withSpark ? { spark: points.slice(-12).map((point) => roundTo(point.v, 2)) } : {}),
      };
    });
    if (cards.length > 0) {
      return {
        shape: 'kpiSet',
        unit: source.unit,
        cards,
        ...(source.note ? { note: source.note } : {}),
      };
    }
  }

  const anchors = anchorsFromTitle(insight, filters, rng, 4);

  const cards: KpiCard[] = anchors.map((anchor, index) => {
    const values = buildSeriesValues(ctx, anchor.level, anchor);
    const deltaPct = monthOnMonthDelta(ctx, anchor);

    return {
      key: `kpi-${index}`,
      label: anchor.label,
      value: roundTo(anchor.level, 2),
      unit: insight.unit,
      deltaPct,
      downIsGood: anchor.downIsGood,
      ...(withSpark ? { spark: values.slice(-12).map((value) => roundTo(value, 2)) } : {}),
    };
  });

  const first = anchors[0];
  return {
    shape: 'kpiSet',
    unit: insight.unit,
    cards,
    ...(first?.note ? { note: first.note } : {}),
  };
}

// ---------------------------------------------------------------------------
// 15. scenarioSet — ScenarioBars
// ---------------------------------------------------------------------------

export function scenarioShape(ctx: ShapeContext): ScenarioData {
  const { insight, panel, anchor, rng } = ctx;
  const baseline = anchor.level;

  if (panel.variant === 'tornado') {
    // A tornado ranks drivers by the width of their swing.
    const drivers = ['Credit losses', 'NII compression', 'FX move', 'Fee attrition', 'Opex inflation'];
    const scenarios = drivers
      .map((label, index) => {
        const swing = baseline * between(rng, 0.04, 0.22);
        return {
          key: `driver-${index}`,
          label,
          value: baseline,
          delta: 0,
          low: roundTo(baseline - swing, 2),
          high: roundTo(baseline + swing, 2),
        };
      })
      .sort((a, b) => (b.high - b.low) - (a.high - a.low));
    return { shape: 'scenarioSet', unit: insight.unit, mode: 'tornado', baseline: roundTo(baseline, 2), scenarios, ...referenceOf(anchor) };
  }

  const isRateShock = /rate shock|\bnii\b sensitivity|sensitivity to rate/.test(insight.title.toLowerCase());
  const labels = isRateShock
    ? ['−200bp', '−100bp', 'Base', '+100bp', '+200bp']
    : ['Severe', 'Adverse', 'Base', 'Mild upside'];

  const scenarios = labels.map((label, index) => {
    const isBase = label === 'Base';
    const position = index - labels.indexOf('Base');
    const delta = isBase ? 0 : roundTo(baseline * position * between(rng, 0.03, 0.09), 2);
    return {
      key: `scenario-${index}`,
      label,
      value: roundTo(clamp(baseline + delta, anchor.min, anchor.max ?? Number.MAX_SAFE_INTEGER), 2),
      delta,
    };
  });

  return {
    shape: 'scenarioSet',
    unit: insight.unit,
    mode: 'scenarios',
    baseline: roundTo(baseline, 2),
    scenarios,
    ...referenceOf(anchor),
  };
}
