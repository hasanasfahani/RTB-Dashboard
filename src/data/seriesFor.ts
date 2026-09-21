/**
 * `insightId` + panel -> chart-ready data. The single entry point charts use.
 *
 * PRD §7.4 sketches `seriesFor(id, filters)`, but 73 of the 163 insights carry two
 * panels that must not render the same chart, so the panel index is part of the
 * signature. `panelsFor()` is the convenience the insight card uses.
 *
 * Resolution order:
 *   1. a `demoPath.ts` override, if one is registered for this id and panel
 *   2. otherwise `shapeFor(component, variant)` -> one of the 15 shape generators
 *
 * There are no per-insight branches outside `demoPath.ts`.
 */

import {
  shapeFor,
  type ChartData,
  type ChartShape,
  type Filters,
  type Insight,
  type Panel,
} from '../types.ts';
import { anchorFor } from './anchors.ts';
import { ASOF } from './bank.ts';
import { demoOverrideFor } from './demoPath.ts';
import { dimensionFor } from './dimensions.ts';
import { DEFAULT_FILTERS, periodWindow } from './filters.ts';
import { axisDates, axisFor, hasDailyData, seeded } from './generators.ts';
import { byId } from './insights.ts';
import {
  breakdownShape,
  bulletShape,
  distributionShape,
  flowsShape,
  funnelShape,
  gaugeShape,
  geoShape,
  kpiShape,
  matrixShape,
  rankedShape,
  scatterShape,
  scenarioShape,
  tableShape,
  timeSeriesShape,
  waterfallShape,
  type ShapeContext,
} from './shapes.ts';

/**
 * The seed deliberately **excludes** `period`.
 *
 * A4 says identical filters must reproduce identical output, and they do. But if the
 * period fed the seed, switching 12M -> 24M would redraw the twelve months already on
 * screen, which reads as a bug to anyone comparing. Period changes the window only;
 * the other three filters change the seed and the magnitudes.
 */
function seedFor(id: string, panelIndex: number, filters: Filters): string {
  return `${id}:${panelIndex}:${filters.branch}|${filters.division}|${filters.currency}`;
}

/**
 * How many trailing points the Period filter shows.
 *
 * The floor is **two**, not one, and that is the whole difficulty of a sub-monthly period on
 * a monthly series. 85 of the 163 insights have no daily figure at all, so "last 30 days"
 * resolves to a single month — one dot, no line, and a chart that reads as broken rather than
 * as short. Two points at least draw the segment the reader asked about.
 *
 * Drawing two months under a heading that says thirty days would be a quiet lie, so the panel
 * says so: see `spanNote`.
 */
function windowFor(days: number, points: number, granularity: 'daily' | 'monthly'): number {
  const wanted = granularity === 'daily' ? days : Math.round(days / 30);
  return Math.max(2, Math.min(points, wanted));
}

/**
 * The caveat a panel carries when its axis cannot honour the period that was asked for.
 *
 * Only ever set when the two genuinely disagree, so it does not become furniture the reader
 * stops seeing.
 */
function spanNote(insight: Insight, days: number, granularity: 'daily' | 'monthly'): string | undefined {
  if (granularity === 'daily' || days > 45) return undefined;
  return hasDailyData(insight.refresh)
    ? undefined
    : `${insight.refresh} data — the shortest meaningful span here is two months, so that is what is shown.`;
}

const GENERATORS: Readonly<Record<ChartShape, (ctx: ShapeContext) => ChartData>> = {
  timeSeries: timeSeriesShape,
  breakdown: breakdownShape,
  ranked: rankedShape,
  matrix: matrixShape,
  funnelSteps: funnelShape,
  distribution: distributionShape,
  flows: flowsShape,
  scatterPoints: scatterShape,
  gaugeSet: gaugeShape,
  bulletRows: bulletShape,
  tableRows: tableShape,
  waterfallSteps: waterfallShape,
  geoPoints: geoShape,
  kpiSet: kpiShape,
  scenarioSet: scenarioShape,
};

function contextFor(
  insight: Insight,
  panel: Panel,
  panelIndex: number,
  filters: Filters,
  primary?: ChartData,
): ShapeContext {
  // One resolution of the period, read by the axis, the window and the caveat alike.
  const { days, endIso } = periodWindow(filters, ASOF);
  const isTimeSeries = shapeFor(panel.component, panel.variant) === 'timeSeries';
  const { granularity, points } = axisFor(insight.refresh, days, isTimeSeries);
  const seed = seedFor(insight.id, panelIndex, filters);
  const anchor = anchorFor(insight, filters, seeded(`${seed}:anchor`));
  const note = spanNote(insight, days, granularity);

  return {
    ...(primary ? { primary } : {}),
    insight,
    panel,
    panelIndex,
    filters,
    rng: seeded(seed),
    anchor,
    dimension: dimensionFor(insight),
    axis: axisDates(insight.refresh, endIso, days, isTimeSeries),
    window: windowFor(days, points, granularity),
    axisKind: granularity === 'daily' ? 'daily' : 'monthly',
    /*
     * A month's growth spread across a month of days, compounding to the same figure.
     * `** (1 / 30)` rather than `/ 30`, so thirty daily steps land exactly on the monthly
     * rate instead of a little under it.
     */
    stepGrowth: granularity === 'daily' ? (1 + anchor.growth) ** (1 / 30) - 1 : anchor.growth,
    ...(note !== undefined ? { spanNote: note } : {}),
  };
}

/**
 * Chart-ready data for one panel of one insight.
 *
 * Throws on an unknown id or an out-of-range panel index — a card that asks for a
 * panel the catalogue does not declare is a bug, not an empty chart.
 */
export function seriesFor(
  id: string,
  panelIndex = 0,
  filters: Filters = DEFAULT_FILTERS,
): ChartData {
  const { data, spanNote: note } = buildPanel(id, panelIndex, filters);
  return withSpanNote(data, note);
}

/**
 * The panel, and separately the caveat its period earned.
 *
 * Kept apart so a **sidecar does not inherit it**. `KpiCards` copies its primary's note,
 * which is right for a caveat about the metric and wrong for one about the window — the card
 * ended up printing the same sentence three times, once under the chart, once under the tiles,
 * and once more where the copy was appended to itself.
 */
function buildPanel(
  id: string,
  panelIndex: number,
  filters: Filters,
): { data: ChartData; spanNote: string | undefined } {
  const insight = byId(id);
  const panel = insight.panels[panelIndex];
  if (!panel) {
    throw new Error(
      `Insight "${id}" has ${insight.panels.length} panel(s); no panel at index ${panelIndex}`,
    );
  }

  /*
   * A second panel is given the first one's data so a sidecar can summarise rather than
   * invent. Cheap: the first panel is generated once more, and both calls are memoised
   * at the component boundary. Taken without the caveat, per the note above.
   */
  const primary =
    panelIndex > 0 && panel.component === 'KpiCards' ? buildPanel(id, 0, filters).data : undefined;

  const override = insight.demoPath ? demoOverrideFor(id, panelIndex) : undefined;
  const ctx = contextFor(insight, panel, panelIndex, filters, primary);
  const data = override
    ? override(ctx)
    : GENERATORS[shapeFor(panel.component, panel.variant)](ctx);

  // Only the primary panel carries it: one caveat per card, not one per panel.
  return { data, spanNote: panelIndex === 0 ? ctx.spanNote : undefined };
}

/**
 * Attaches the span caveat to whatever the generator produced.
 *
 * Applied here rather than inside the fifteen generators for the obvious reason — one place
 * instead of fifteen — and after the demo-path overrides too, which would otherwise be the
 * only panels that could contradict their own heading.
 *
 * An existing note is kept and the caveat joins it. A generator's note is about the metric
 * and this one is about the window; neither replaces the other — unless it is already there,
 * which a copied note can make true.
 */
function withSpanNote(data: ChartData, note: string | undefined): ChartData {
  if (!note || data.note?.includes(note)) return data;
  return { ...data, note: data.note ? `${data.note} ${note}` : note };
}

/** Data for every panel of an insight, in panel order. Used by the insight card. */
export function panelsFor(id: string, filters: Filters = DEFAULT_FILTERS): readonly ChartData[] {
  return byId(id).panels.map((_, panelIndex) => seriesFor(id, panelIndex, filters));
}
