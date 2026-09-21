/**
 * How to read each chart.
 *
 * The catalogue explains *what* an insight measures and *how it is calculated*. Neither
 * tells a reader how to decode the marks in front of them — what the dashed line means,
 * why a treemap's areas matter, what the diagonal on a Lorenz curve is. A dashboard that
 * teaches its own notation is a dashboard that can be handed to someone.
 *
 * Keyed on component, with a variant override where the variant changes the reading
 * rather than just the styling. Conventions that hold everywhere (PRD §8) are stated
 * once in `UNIVERSAL` rather than repeated 23 times.
 */

import type { ChartComponent } from '../types.ts';

export interface ChartGuide {
  /** How the marks encode the data. */
  readonly reading: string;
  /** What a reader should be looking for. */
  readonly lookFor: string;
}

/** True of every chart in the application, so it is said once. */
export const UNIVERSAL =
  'Hover any mark for its exact value. Dashed lines are references, never data: grey is a target or appetite band, red is a regulatory minimum and is always labelled.';

const BY_COMPONENT: Readonly<Record<ChartComponent, ChartGuide>> = {
  KpiCards: {
    reading:
      'Each tile is one metric at the as-at date. The arrow and percentage beneath it are the month-on-month change, and the small line is the last twelve months.',
    lookFor:
      'The direction, not just the level. Colour follows what is good for that metric, so a fall in cost-to-income or NPL reads green while a fall in deposits reads red.',
  },
  LineChart: {
    reading:
      'One point per month-end, joined left to right. Where more than one series is drawn, the legend above names them in the order navy, cyan, then the lighter ramp.',
    lookFor:
      'The slope and any change in it. A line that flattens or turns is usually the finding, not the level it reaches.',
  },
  AreaChart: {
    reading:
      'A line with the area beneath it filled. Where the areas are stacked, each band sits on top of the one below, so the top edge is the total and each band is its own contribution.',
    lookFor:
      'Whether a band is growing in its own right or only because the total is. A band can widen while its share falls.',
  },
  BarChart: {
    reading: 'One bar per category, height proportional to value, drawn in a single colour.',
    lookFor:
      'Relative size. The bars are deliberately one colour — rank is carried by height, not by hue.',
  },
  RankedBar: {
    reading:
      'Horizontal bars, longest first. The layout is horizontal so that long category names stay readable.',
    lookFor: 'The gap between first and second, and where the list flattens out.',
  },
  StackedBar: {
    reading:
      'Each column is one period, split into its component parts. Where the chart is a ladder, each column is a bucket — a maturity band or a rate band — rather than a point in time.',
    lookFor:
      'Both the total column height and the mix within it. A stable total can hide a large shift in composition.',
  },
  ComboChart: {
    reading:
      'Two measures on one frame. Bars and a line share the left axis; where both are lines, the second reads against the right-hand axis and its legend entry says so.',
    lookFor:
      'Whether the two move together. Two measures are drawn on one chart because the relationship between them is the point.',
  },
  DonutChart: {
    reading:
      'Segment angle is proportional to share of the total, which is printed in the centre.',
    lookFor:
      'The two or three largest segments. A donut is for showing that a handful of things dominate, not for comparing the small ones.',
  },
  Treemap: {
    reading:
      'Each rectangle is one category and its **area** is proportional to value. Tiles are laid out largest first, from the top-left.',
    lookFor:
      'Concentration. A treemap makes it immediately visible when a few categories occupy most of the book.',
  },
  FunnelChart: {
    reading:
      'Each band is a stage, top to bottom, with width proportional to volume. The percentage on a band is its conversion from the stage above, not from the top.',
    lookFor:
      'The steepest narrowing. That step, not the final conversion, is where the process is losing people.',
  },
  WaterfallChart: {
    reading:
      'Bars step from an opening value to a closing one. Navy bars are the anchors at each end; cyan steps add and mid-blue steps subtract.',
    lookFor:
      'The largest single step. A subtraction here is an expense or a charge — expected, not a warning, which is why it is not drawn in red.',
  },
  Heatmap: {
    reading:
      'A grid of two dimensions, named on the top and left edges. Colour depth carries magnitude, with the scale and its range printed beneath. A traffic-light grid uses green, amber and red against explicit limits instead.',
    lookFor:
      'Rows or columns that are consistently dark, and single cells that break their neighbourhood. In a cohort grid the triangle is expected — younger cohorts have simply had fewer months to age.',
  },
  ParetoChart: {
    reading:
      'Bars ranked largest first against the left axis, with a cumulative share line against the right. The dashed line marks 80%. A Lorenz view instead plots cumulative share against share of the population, with the diagonal representing perfect equality.',
    lookFor:
      'Where the cumulative line crosses 80% — that is how few categories account for most of the total. On a Lorenz curve, the bow away from the diagonal *is* the concentration.',
  },
  GaugeChart: {
    reading:
      'The arc runs from the metric floor to its ceiling. The dashed tick is the target; a red dashed tick is a regulatory minimum, labelled beneath. Green is on plan, amber is drift, red is a breach of a regulatory floor.',
    lookFor:
      'The side of the target the needle sits on. Direction matters per metric: above target is good for capital and bad for cost-to-income.',
  },
  BulletChart: {
    reading:
      'The dark bar is the measure, the vertical dashed marker is the target, and the grey bands behind are qualitative ranges.',
    lookFor:
      'Whether the bar clears the marker. The bands give a sense of how far short or ahead, without needing an axis.',
  },
  ScatterPlot: {
    reading:
      'One point per entity, positioned by the two measures named on the axes; point size carries a third where it is relevant. A quadrant view splits on the averages; a break-even view draws the line where the two measures are equal.',
    lookFor:
      'The shape of the cloud, and the points that sit away from it. In a quadrant view the corner a point falls into is the classification.',
  },
  SankeyDiagram: {
    reading:
      'Sources on the left, destinations on the right, with ribbon thickness proportional to the value flowing between them.',
    lookFor:
      'The thickest ribbons, and any source whose flow spreads evenly rather than concentrating.',
  },
  GeoMap: {
    reading:
      'One circle per branch, positioned on a schematic outline of Iraq, with circle **area** proportional to value. The outline is indicative and not to survey accuracy.',
    lookFor:
      'How much of the network sits in Baghdad and Erbil. Click any branch to filter the whole dashboard to it, and click it again to clear.',
  },
  VintageCurves: {
    reading:
      'Each line is an origination cohort, plotted against months on book rather than calendar time, so cohorts opened at different dates start together at zero.',
    lookFor:
      'Whether newer cohorts sit above or below older ones at the same age. That comparison is the whole purpose of a vintage chart — it is how underwriting quality is judged before a book has matured.',
  },
  Histogram: {
    reading:
      'Values are grouped into equal bands along the bottom; bar height is the count in each band. Where two populations are overlaid they are drawn side by side within each band.',
    lookFor:
      'The shape and the spread, not the peak. A long tail to the right is common in balances and usually matters more than the mode.',
  },
  BoxPlot: {
    reading:
      'The box spans the middle half of the distribution, from the lower to the upper quartile, with the line inside it the median. The whiskers reach the minimum and maximum.',
    lookFor:
      'Box width as much as position. A wide box means the group is internally inconsistent, which an average would have hidden.',
  },
  DataTable: {
    reading:
      'An exception report. Rows outside limit carry a red rule on the leading edge and a status word; the count beneath the table gives the total.',
    lookFor: 'The flagged rows. Everything else is shown for context.',
  },
  ScenarioBars: {
    reading:
      'Each bar is one modelled outcome, with the base case marked by a dashed line. A tornado view instead ranks drivers by the width of their swing around the base, downside in amber and upside in cyan.',
    lookFor:
      'On a tornado, the top bar — the widest swing is the exposure most worth hedging, regardless of which direction it runs.',
  },
};

/** Variant overrides, where the variant changes the reading rather than the styling. */
const BY_VARIANT: Readonly<Record<string, Partial<ChartGuide>>> = {
  'LineChart:appetiteBand': {
    lookFor:
      'Whether the line stays inside the shaded appetite band. Leaving the band is the signal, not the level itself.',
  },
  'LineChart:peakMarkers': {
    lookFor: 'The marked peaks — they are local maxima, flagged so the pattern of spikes is legible.',
  },
  'LineChart:adoptionCurve': {
    lookFor:
      'Where the curve begins to flatten. An adoption curve slowing is a sign the addressable base is being reached, not that the product is failing.',
  },
  'StackedBar:percent': {
    reading:
      'Each column is normalised to 100%, so only the mix is shown and the underlying total is deliberately hidden.',
  },
  'Heatmap:cohort': {
    reading:
      'Rows are origination cohorts and columns are months since. The grid is triangular because younger cohorts have had fewer months to observe.',
  },
};

export function guideFor(component: ChartComponent, variant: string): ChartGuide {
  const base = BY_COMPONENT[component];
  const override = BY_VARIANT[`${component}:${variant}`];
  return override ? { ...base, ...override } : base;
}
