/**
 * Domain types for the RTB BI demo.
 *
 * `Insight` mirrors `RTB_insights.json` exactly (PRD §6). The catalogue is the
 * content spine: it is never edited, only read, so these types describe a file
 * we do not control and every field is required.
 */

export type Layer = 'executive' | 'bank-wide' | 'retail' | 'corporate';

export const LAYERS: readonly Layer[] = ['executive', 'bank-wide', 'retail', 'corporate'];

/**
 * The 23 chart components referenced by the catalogue.
 *
 * D2 (plan §3): `TrafficLightPanel` and `FlowDiagram` appear in PRD §6's union and
 * §4's hand-rolled SVG list but are referenced by none of the 236 panels, so they
 * are omitted. The union is therefore exhaustive over the real data, and a future
 * catalogue that introduces one will fail `parseCatalogue()` loudly rather than
 * render a blank card.
 */
export type ChartComponent =
  | 'KpiCards'
  | 'LineChart'
  | 'AreaChart'
  | 'BarChart'
  | 'RankedBar'
  | 'StackedBar'
  | 'ComboChart'
  | 'DonutChart'
  | 'Treemap'
  | 'FunnelChart'
  | 'WaterfallChart'
  | 'Heatmap'
  | 'ParetoChart'
  | 'GaugeChart'
  | 'BulletChart'
  | 'ScatterPlot'
  | 'SankeyDiagram'
  | 'GeoMap'
  | 'VintageCurves'
  | 'Histogram'
  | 'BoxPlot'
  | 'DataTable'
  | 'ScenarioBars';

/**
 * Every `(component, variant)` pair the catalogue actually uses — 39 of them.
 *
 * `satisfies` enforces that all 23 components are present, so adding a component
 * to the union without declaring its variants is a compile error. Validated
 * against the data by `scripts/verify-data.ts`.
 */
export const VARIANTS_BY_COMPONENT = {
  KpiCards: ['sparkline', 'plain'],
  LineChart: ['single', 'adoptionCurve', 'appetiteBand', 'peakMarkers'],
  AreaChart: ['single', 'stacked'],
  BarChart: ['plain'],
  RankedBar: ['plain'],
  StackedBar: ['absolute', 'percent', 'ladder'],
  ComboChart: ['barsPlusLine', 'dualAxisLines'],
  DonutChart: ['plain'],
  Treemap: ['plain'],
  FunnelChart: ['plain'],
  WaterfallChart: ['plain'],
  Heatmap: ['intensity', 'rag', 'cohort'],
  ParetoChart: ['plain', 'lorenz'],
  GaugeChart: ['target', 'regulatoryFloor'],
  BulletChart: ['plain'],
  ScatterPlot: ['plain', 'quadrant', 'breakEven'],
  SankeyDiagram: ['plain'],
  GeoMap: ['iraqBranches'],
  VintageCurves: ['plain'],
  Histogram: ['single', 'overlay'],
  BoxPlot: ['plain'],
  DataTable: ['exception'],
  ScenarioBars: ['scenarios', 'tornado'],
} as const satisfies Record<ChartComponent, readonly string[]>;

export type ChartVariant = (typeof VARIANTS_BY_COMPONENT)[ChartComponent][number];

export type Unit = 'iqd' | 'percent' | 'count';

/** The four `refresh` strings in the catalogue. D1 keys series granularity off this. */
export type Refresh = 'Daily' | 'Daily / Monthly' | 'Monthly' | 'Monthly / Quarterly';

export interface Panel {
  readonly component: ChartComponent;
  readonly variant: ChartVariant;
}

export interface Insight {
  /** e.g. `R-17` — stable, used in routes and deep links. */
  readonly id: string;
  readonly layer: Layer;
  readonly layerLabel: string;
  /** Section name, correctly cased. Prefer this over `group` for display — see plan §2.5. */
  readonly domain: string;
  /** Section name as the workbook spelled it. The key and slug source, not the label. */
  readonly group: string;
  readonly title: string;
  readonly whatItTells: string;
  readonly method: string;
  readonly vizLabel: string;
  /** 1 or 2 panels. Render exactly these — never collapse or invent. */
  readonly panels: readonly [Panel] | readonly [Panel, Panel];
  readonly refresh: Refresh;
  readonly unit: Unit;
  /** The 36 insights carrying the CEO narrative (PRD §6). */
  readonly demoPath: boolean;
}

/** The JSON is an envelope, not a bare array (plan §2.1). */
export interface InsightCatalogue {
  readonly generatedFrom: string;
  readonly count: number;
  readonly insights: readonly Insight[];
}

/**
 * A tab on an insight page, derived from the catalogue at runtime so it cannot
 * drift from the content (PRD §10).
 */
export interface Section {
  readonly layer: Layer;
  /** The raw `group` value. Unique within a layer, not globally — `Capital` is in two. */
  readonly key: string;
  /** URL segment, e.g. `deposits-liabilities`. Layer-scoped (plan §2.6). */
  readonly slug: string;
  /** Display label, taken from `domain` so `ALM` is not rendered as `Alm`. */
  readonly label: string;
  readonly count: number;
  /** Workbook order within the layer, 0-based. */
  readonly order: number;
}

/** Series granularity, decided by `refresh` per D1. */
export type Granularity = 'daily' | 'monthly';

// ===========================================================================
// Phase 2 — filters and the chart-data contract
// ===========================================================================

export type Period = '30D' | 'LM' | '3M' | '6M' | '12M' | '24M' | 'custom';
export type DivisionFilter = 'all' | 'retail' | 'corporate' | 'treasury';
export type CurrencyFilter = 'all' | 'IQD' | 'USD' | 'OTHER';
/** `'all'` or a branch id from `entities.ts`. */
export type BranchFilter = string;

export const PERIODS: readonly Period[] = ['30D', 'LM', '3M', '6M', '12M', '24M', 'custom'];

/** Global filter state (PRD §12). Folded into both the seed and the magnitudes. */
export interface Filters {
  readonly period: Period;
  /**
   * Only for `period: 'custom'`, and both ends are ISO dates.
   *
   * Absent otherwise — not set to undefined, because `'from' in filters` is how the share
   * link and the per-block scope decide whether there is anything to carry.
   */
  readonly from?: string;
  readonly to?: string;
  readonly branch: BranchFilter;
  readonly division: DivisionFilter;
  readonly currency: CurrencyFilter;
}

/** Target lines, regulatory floors and appetite bands (PRD §8 `ChartProps`). */
export interface Reference {
  readonly label: string;
  readonly value: number;
  readonly kind: 'target' | 'floor' | 'band';
  /** Upper bound, for `kind: 'band'`. */
  readonly upper?: number;
}

/** Shared by every shape. */
export interface ChartDataBase {
  readonly unit: Unit;
  readonly reference?: readonly Reference[];
  /** Shown as a caveat on the chart, e.g. where PRD Appendix A note 5 applies. */
  readonly note?: string;
}

export type SeriesRole = 'bar' | 'line' | 'area';
export type AxisKind = 'monthly' | 'daily' | 'ordinal';

export interface TimeSeriesPoint {
  /** ISO date for `monthly`/`daily`, a label for `ordinal`. */
  readonly t: string;
  readonly v: number;
}

export interface TimeSeries {
  readonly key: string;
  readonly label: string;
  readonly points: readonly TimeSeriesPoint[];
  /** For `ComboChart`: which mark this series draws as. */
  readonly role?: SeriesRole;
  /** For `ComboChart:dualAxisLines`. */
  readonly axis?: 'left' | 'right';
}

export interface TimeSeriesData extends ChartDataBase {
  readonly shape: 'timeSeries';
  readonly axisKind: AxisKind;
  readonly series: readonly TimeSeries[];
  /** True for `StackedBar` and `AreaChart:stacked`. */
  readonly stacked?: boolean;
  /** True for `StackedBar:percent` — normalise each period to 100%. */
  readonly normalised?: boolean;
}

export interface BreakdownSlice {
  readonly key: string;
  readonly label: string
  readonly value: number;
  /** Sub-parts, for `StackedBar:ladder` where each bucket is itself stacked. */
  readonly parts?: readonly { readonly key: string; readonly label: string; readonly value: number }[];
}

export interface BreakdownData extends ChartDataBase {
  readonly shape: 'breakdown';
  /** Slices sum to this. */
  readonly total: number;
  readonly slices: readonly BreakdownSlice[];
  /** Axis label when slices are buckets rather than categories. */
  readonly bucketLabel?: string;
}

export interface RankedItem {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** Running share of the total, for `ParetoChart`. */
  readonly cumulativePct: number;
}

export interface RankedData extends ChartDataBase {
  readonly shape: 'ranked';
  readonly total: number;
  readonly items: readonly RankedItem[];
  /** For `ParetoChart:lorenz` — the x axis is a population share, not a category. */
  readonly lorenz?: boolean;
  /**
   * The population the ranking is computed over.
   *
   * A Lorenz curve's *shape* is a structural property and does not move when a branch
   * is selected — which would leave the chart looking inert under a filter. Stating the
   * base it covers keeps PRD §12 honest without making the headline concentration
   * figure wobble mid-demo.
   */
  readonly basis?: { readonly label: string; readonly value: number; readonly unit: Unit };
}

export type RagStatus = 'green' | 'amber' | 'red';

export interface MatrixCell {
  readonly row: string;
  readonly col: string;
  readonly value: number;
  /** Set for `Heatmap:rag`, which is doing the traffic-light job. */
  readonly status?: RagStatus;
}

export interface MatrixData extends ChartDataBase {
  readonly shape: 'matrix';
  readonly rows: readonly string[];
  readonly cols: readonly string[];
  /** Sparse: `Heatmap:cohort` is triangular, so absent cells are expected. */
  readonly cells: readonly MatrixCell[];
  readonly rowLabel?: string;
  readonly colLabel?: string;
}

export interface FunnelStep {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** Share of the previous step, 0–100. 100 for the first step. */
  readonly conversionPct: number;
}

export interface FunnelData extends ChartDataBase {
  readonly shape: 'funnelSteps';
  readonly steps: readonly FunnelStep[];
}

export interface HistogramBin {
  readonly from: number;
  readonly to: number;
  readonly counts: readonly number[];
}

export interface BoxPlotGroup {
  readonly key: string;
  readonly label: string;
  readonly min: number;
  readonly q1: number;
  readonly median: number;
  readonly q3: number;
  readonly max: number;
}

export interface DistributionData extends ChartDataBase {
  readonly shape: 'distribution';
  /** One entry per overlaid series; `Histogram:single` has one. */
  readonly seriesLabels: readonly string[];
  /** Populated for `Histogram`. */
  readonly bins: readonly HistogramBin[];
  /** Populated for `BoxPlot`. */
  readonly groups: readonly BoxPlotGroup[];
  readonly valueLabel?: string;
}

export interface FlowNode {
  readonly id: string;
  readonly label: string;
}

export interface FlowLink {
  readonly from: string;
  readonly to: string;
  readonly value: number;
}

export interface FlowsData extends ChartDataBase {
  readonly shape: 'flows';
  readonly nodes: readonly FlowNode[];
  readonly links: readonly FlowLink[];
}

export interface ScatterPoint {
  readonly key: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly size?: number;
}

export interface ScatterData extends ChartDataBase {
  readonly shape: 'scatterPoints';
  readonly points: readonly ScatterPoint[];
  readonly xLabel: string;
  readonly yLabel: string;
  /** For `quadrant` and `breakEven`, the dividing lines. */
  readonly quadrantX?: number;
  readonly quadrantY?: number;
}

export interface Gauge {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly target?: number;
  /** Regulatory minimum. Rendered red and dashed, always labelled (PRD §8). */
  readonly floor?: number;
  /**
   * Whether a fall is good for this metric. Without it a gauge cannot tell "on plan"
   * from "drift": CIR above its target is drift, CAR above its target is not.
   */
  readonly downIsGood?: boolean;
}

/** Several gauges in one panel — E-02 is NIM *and* CIR, E-04 is LCR, NSFR and LDR (plan §2.8). */
export interface GaugeSetData extends ChartDataBase {
  readonly shape: 'gaugeSet';
  readonly gauges: readonly Gauge[];
}

export interface BulletRow {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly target: number;
  /** Qualitative bands, ascending. */
  readonly ranges: readonly number[];
}

/** Several rows in one panel — E-03 is ROE *and* ROA (plan §2.8). */
export interface BulletData extends ChartDataBase {
  readonly shape: 'bulletRows';
  readonly rows: readonly BulletRow[];
}

export interface TableColumn {
  readonly key: string;
  readonly label: string;
  readonly align: 'start' | 'end';
  readonly unit?: Unit;
}

export interface TableData extends ChartDataBase {
  readonly shape: 'tableRows';
  readonly columns: readonly TableColumn[];
  readonly rows: readonly Readonly<Record<string, string | number>>[];
  /** Row keys to flag — `DataTable:exception` is an exception report. */
  readonly flagged?: readonly string[];
}

export interface WaterfallStep {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly kind: 'start' | 'delta' | 'total';
}

export interface WaterfallData extends ChartDataBase {
  readonly shape: 'waterfallSteps';
  readonly steps: readonly WaterfallStep[];
}

export interface GeoPoint {
  readonly id: string;
  readonly label: string;
  readonly lon: number;
  readonly lat: number;
  readonly value: number;
}

export interface GeoData extends ChartDataBase {
  readonly shape: 'geoPoints';
  readonly points: readonly GeoPoint[];
}

export interface KpiCard {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly unit: Unit;
  /** Month-on-month change, in percent. */
  readonly deltaPct?: number;
  /** Whether a fall is good for this metric (NPL, CIR, cost, impairment) — PRD §9. */
  readonly downIsGood?: boolean;
  /** 12-point sparkline, for `KpiCards:sparkline`. */
  readonly spark?: readonly number[];
}

export interface KpiData extends ChartDataBase {
  readonly shape: 'kpiSet';
  readonly cards: readonly KpiCard[];
}

export interface Scenario {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** Change against the base case. */
  readonly delta: number;
  /** For `tornado`: the downside and upside of this driver. */
  readonly low?: number;
  readonly high?: number;
}

export interface ScenarioData extends ChartDataBase {
  readonly shape: 'scenarioSet';
  readonly mode: 'scenarios' | 'tornado';
  readonly baseline: number;
  readonly scenarios: readonly Scenario[];
}

/** The 15 shapes that cover all 23 components. */
export type ChartData =
  | TimeSeriesData
  | BreakdownData
  | RankedData
  | MatrixData
  | FunnelData
  | DistributionData
  | FlowsData
  | ScatterData
  | GaugeSetData
  | BulletData
  | TableData
  | WaterfallData
  | GeoData
  | KpiData
  | ScenarioData;

export type ChartShape = ChartData['shape'];

/** Which shape each component consumes. Exhaustive over `ChartComponent`. */
export const SHAPE_BY_COMPONENT = {
  KpiCards: 'kpiSet',
  LineChart: 'timeSeries',
  AreaChart: 'timeSeries',
  ComboChart: 'timeSeries',
  VintageCurves: 'timeSeries',
  StackedBar: 'timeSeries',
  DonutChart: 'breakdown',
  Treemap: 'breakdown',
  BarChart: 'ranked',
  RankedBar: 'ranked',
  ParetoChart: 'ranked',
  Heatmap: 'matrix',
  FunnelChart: 'funnelSteps',
  Histogram: 'distribution',
  BoxPlot: 'distribution',
  SankeyDiagram: 'flows',
  ScatterPlot: 'scatterPoints',
  GaugeChart: 'gaugeSet',
  BulletChart: 'bulletRows',
  DataTable: 'tableRows',
  WaterfallChart: 'waterfallSteps',
  GeoMap: 'geoPoints',
  ScenarioBars: 'scenarioSet',
} as const satisfies Record<ChartComponent, ChartShape>;

/**
 * `StackedBar:ladder` is buckets-with-parts rather than a time series — maturity,
 * repricing, rate and collateral ladders. It overrides `SHAPE_BY_COMPONENT`.
 */
export const SHAPE_OVERRIDES: readonly { component: ChartComponent; variant: string; shape: ChartShape }[] = [
  { component: 'StackedBar', variant: 'ladder', shape: 'breakdown' },
];

export function shapeFor(component: ChartComponent, variant: string): ChartShape {
  const override = SHAPE_OVERRIDES.find((o) => o.component === component && o.variant === variant);
  return override ? override.shape : SHAPE_BY_COMPONENT[component];
}
