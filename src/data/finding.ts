/**
 * What the numbers are *doing* — one line per panel.
 *
 * The catalogue's `whatItTells` is a definition: "The two efficiency ratios every board
 * watches." True, and useless in front of a chart that is already drawn. An analyst
 * would have written "NIM 20bp under plan, CIR 2.4pp over — both drifting." That
 * sentence is the difference between a dashboard that reports and one that has a view.
 *
 * Every finding is derived from the `ChartData` actually rendered, never restated from
 * the fixture, so a finding cannot contradict the chart above it.
 */

import type {
  BreakdownData,
  BulletData,
  ChartData,
  DistributionData,
  FlowsData,
  FunnelData,
  GaugeSetData,
  GeoData,
  KpiData,
  MatrixData,
  RankedData,
  ScatterData,
  ScenarioData,
  TableData,
  TimeSeriesData,
  WaterfallData,
} from '../types.ts';
import { formatDelta, formatPercent } from '../design/format.ts';
import { change, direction, gap, share, value } from './figures.ts';

// ---------------------------------------------------------------------------

function timeSeriesFinding(data: TimeSeriesData): string | undefined {
  const primary = data.series[0];
  const points = primary?.points ?? [];
  if (!primary || points.length < 2) return undefined;

  const first = points[0]?.v ?? 0;
  const last = points.at(-1)?.v ?? 0;
  const movement = change(first, last);

  // A stacked composition is about the mix, so lead with the largest band.
  if (data.stacked && data.series.length > 1) {
    const totals = data.series.map((s) => ({ label: s.label, v: s.points.at(-1)?.v ?? 0 }));
    const total = totals.reduce((sum, t) => sum + t.v, 0);
    const biggest = [...totals].sort((a, b) => b.v - a.v)[0];
    if (!biggest || total === 0) return undefined;
    return `${biggest.label} is the largest share at ${formatPercent(share(biggest.v, total))} of the total${
      movement !== undefined
        ? `, with the book ${direction(movement)} ${Math.abs(movement).toFixed(1)}% over the window`
        : ''
    }.`;
  }

  if (movement === undefined) return undefined;
  const over = `over the last ${points.length} ${data.axisKind === 'daily' ? 'days' : 'months'}`;
  const target = data.reference?.find((r) => r.kind === 'target');
  const floor = data.reference?.find((r) => r.kind === 'floor');

  let tail = '';
  if (floor) {
    tail =
      last >= floor.value
        ? `, ${gap(last, floor.value, data.unit)} clear of the ${value(floor.value, data.unit)} floor`
        : `, **below** the ${value(floor.value, data.unit)} regulatory floor`;
  } else if (target) {
    tail =
      last >= target.value
        ? `, ${gap(last, target.value, data.unit)} above the ${value(target.value, data.unit)} target`
        : `, ${gap(last, target.value, data.unit)} short of the ${value(target.value, data.unit)} target`;
  }

  // `direction` already carries the sign in words, so the number goes unsigned.
  const magnitude = `${Math.abs(movement).toFixed(1)}%`;
  return `${primary.label} at ${value(last, data.unit)}, ${direction(movement)} ${magnitude} ${over}${tail}.`;
}

function breakdownFinding(data: BreakdownData): string | undefined {
  if (data.slices.length === 0) return undefined;
  const ranked = [...data.slices].sort((a, b) => b.value - a.value);
  const top = ranked[0];
  if (!top) return undefined;
  const total = data.total || ranked.reduce((sum, s) => sum + s.value, 0);
  const topTwo = ranked.slice(0, 2).reduce((sum, s) => sum + s.value, 0);
  return `${top.label} is the largest at ${value(top.value, data.unit)}, ${formatPercent(
    share(top.value, total),
  )} of the total; the top two together are ${formatPercent(share(topTwo, total))}.`;
}

function rankedFinding(data: RankedData): string | undefined {
  if (data.items.length === 0) return undefined;

  if (data.lorenz) {
    const p1 = data.items.find((i) => i.key === 'p1');
    const p5 = data.items.find((i) => i.key === 'p5');
    if (p1 && p5) {
      return `The top 1% of customers hold ${formatPercent(p1.cumulativePct)} of the total and the top 5% hold ${formatPercent(
        p5.cumulativePct,
      )} — a concentrated book, and a liquidity question.`;
    }
  }

  // How few items reach 80% — the Pareto reading.
  const toEighty = data.items.findIndex((i) => i.cumulativePct >= 80);
  const top = data.items[0];
  if (!top) return undefined;
  const count = toEighty >= 0 ? toEighty + 1 : data.items.length;
  return `${top.label} leads at ${value(top.value, data.unit)}; ${count} of ${data.items.length} account for 80% of the total.`;
}

function gaugeFinding(data: GaugeSetData): string | undefined {
  const parts = data.gauges
    .map((g) => {
      if (g.floor !== undefined) {
        return g.value >= g.floor
          ? `${g.label} ${value(g.value, data.unit)}, ${gap(g.value, g.floor, data.unit)} above its floor`
          : `${g.label} ${value(g.value, data.unit)}, **below** its ${value(g.floor, data.unit)} floor`;
      }
      if (g.target !== undefined) {
        const favourable = g.downIsGood ? g.value <= g.target : g.value >= g.target;
        return `${g.label} ${value(g.value, data.unit)}, ${gap(g.value, g.target, data.unit)} ${
          favourable ? 'better than' : 'off'
        } plan`;
      }
      return `${g.label} ${value(g.value, data.unit)}`;
    })
    .filter(Boolean);
  if (parts.length === 0) return undefined;

  const allGood = data.gauges.every((g) =>
    g.floor !== undefined
      ? g.value >= g.floor
      : g.target === undefined || (g.downIsGood ? g.value <= g.target : g.value >= g.target),
  );
  return `${parts.join('; ')}.${allGood ? '' : ' Watch the shortfall.'}`;
}

function bulletFinding(data: BulletData): string | undefined {
  const parts = data.rows.map((r) => {
    const met = r.value >= r.target;
    return `${r.label} ${value(r.value, data.unit)} against a ${value(r.target, data.unit)} plan — ${
      met ? 'ahead' : `${gap(r.value, r.target, data.unit)} short`
    }`;
  });
  return parts.length > 0 ? `${parts.join('; ')}.` : undefined;
}

function kpiFinding(data: KpiData): string | undefined {
  const lead = data.cards[0];
  if (!lead) return undefined;
  const moving = data.cards.filter((c) => c.deltaPct !== undefined);
  if (moving.length === 0) return `${lead.label} at ${value(lead.value, lead.unit)}.`;
  const parts = moving
    .slice(0, 3)
    .map((c) => `${c.label} ${value(c.value, c.unit)} (${formatDelta(c.deltaPct ?? 0)})`);
  return `${parts.join(', ')} month on month.`;
}

function waterfallFinding(data: WaterfallData): string | undefined {
  const start = data.steps[0];
  const end = data.steps.at(-1);
  const deltas = data.steps.filter((s) => s.kind === 'delta');
  if (!start || !end || deltas.length === 0) return undefined;
  const biggest = [...deltas].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
  if (!biggest) return undefined;
  return `From ${value(start.value, data.unit)} to ${value(end.value, data.unit)}; ${
    biggest.label
  } is the largest single movement at ${value(Math.abs(biggest.value), data.unit)} ${
    biggest.value < 0 ? 'against' : 'in favour'
  }.`;
}

function funnelFinding(data: FunnelData): string | undefined {
  const first = data.steps[0];
  const last = data.steps.at(-1);
  if (!first || !last || data.steps.length < 2) return undefined;
  const worst = [...data.steps.slice(1)].sort((a, b) => a.conversionPct - b.conversionPct)[0];
  const end = share(last.value, first.value);
  return `${formatPercent(end)} of ${first.label.toLowerCase()} reach ${last.label.toLowerCase()}; the steepest drop is into ${
    worst?.label.toLowerCase() ?? 'the next stage'
  } at ${formatPercent(worst?.conversionPct ?? 0)}.`;
}

function matrixFinding(data: MatrixData): string | undefined {
  if (data.cells.length === 0) return undefined;
  const rag = data.cells.filter((c) => c.status !== undefined);
  if (rag.length > 0) {
    const red = rag.filter((c) => c.status === 'red').length;
    const amber = rag.filter((c) => c.status === 'amber').length;
    return red + amber === 0
      ? `All ${rag.length} indicators within limit.`
      : `${red} indicator${red === 1 ? '' : 's'} breaching and ${amber} on watch, out of ${rag.length}.`;
  }
  const hottest = [...data.cells].sort((a, b) => b.value - a.value)[0];
  if (!hottest) return undefined;
  return `Heaviest concentration in ${hottest.row} at ${hottest.col}, ${value(hottest.value, data.unit)}.`;
}

function flowsFinding(data: FlowsData): string | undefined {
  if (data.links.length === 0) return undefined;
  const label = new Map(data.nodes.map((n) => [n.id, n.label]));
  const biggest = [...data.links].sort((a, b) => b.value - a.value)[0];
  const total = data.links.reduce((sum, l) => sum + l.value, 0);
  if (!biggest) return undefined;
  return `Largest flow is ${label.get(biggest.from) ?? ''} to ${label.get(biggest.to) ?? ''} at ${value(
    biggest.value,
    data.unit,
  )}, ${formatPercent(share(biggest.value, total))} of everything moving.`;
}

function scatterFinding(data: ScatterData): string | undefined {
  if (data.points.length < 3) return undefined;
  if (data.quadrantX !== undefined && data.quadrantY !== undefined) {
    const upperRight = data.points.filter(
      (p) => p.x >= (data.quadrantX ?? 0) && p.y >= (data.quadrantY ?? 0),
    ).length;
    const lowerRight = data.points.filter(
      (p) => p.x >= (data.quadrantX ?? 0) && p.y < (data.quadrantY ?? 0),
    ).length;
    return `${upperRight} of ${data.points.length} sit in the favourable quadrant; ${lowerRight} carry high ${data.xLabel.toLowerCase()} without the ${data.yLabel.toLowerCase()} to match.`;
  }
  const best = [...data.points].sort((a, b) => b.y - a.y)[0];
  if (!best) return undefined;
  return `${data.points.length} plotted on ${data.xLabel.toLowerCase()} against ${data.yLabel.toLowerCase()}; ${best.label} leads on ${data.yLabel.toLowerCase()}.`;
}

function distributionFinding(data: DistributionData): string | undefined {
  if (data.groups.length > 0) {
    const widest = [...data.groups].sort((a, b) => b.q3 - b.q1 - (a.q3 - a.q1))[0];
    if (!widest) return undefined;
    return `${widest.label} is the most dispersed — middle half between ${value(
      widest.q1,
      data.unit,
    )} and ${value(widest.q3, data.unit)}, median ${value(widest.median, data.unit)}.`;
  }
  if (data.bins.length === 0) return undefined;
  const total = data.bins.reduce((sum, b) => sum + (b.counts[0] ?? 0), 0);
  const peak = [...data.bins].sort((a, b) => (b.counts[0] ?? 0) - (a.counts[0] ?? 0))[0];
  if (!peak || total === 0) return undefined;
  return `Most concentrated between ${value(peak.from, data.unit)} and ${value(
    peak.to,
    data.unit,
  )}, holding ${formatPercent(share(peak.counts[0] ?? 0, total))} of the population.`;
}

function geoFinding(data: GeoData): string | undefined {
  if (data.points.length === 0) return undefined;
  const ranked = [...data.points].sort((a, b) => b.value - a.value);
  const total = ranked.reduce((sum, p) => sum + p.value, 0);
  const topTwo = ranked.slice(0, 2);
  if (topTwo.length < 2) return undefined;
  return `${topTwo[0]?.label} and ${topTwo[1]?.label} carry ${formatPercent(
    share(topTwo.reduce((s, p) => s + p.value, 0), total),
  )} between them across ${data.points.length} branches.`;
}

function tableFinding(data: TableData): string | undefined {
  const flagged = data.flagged?.length ?? 0;
  return flagged === 0
    ? `All ${data.rows.length} rows within limit.`
    : `${flagged} of ${data.rows.length} rows outside limit.`;
}

function scenarioFinding(data: ScenarioData): string | undefined {
  if (data.scenarios.length === 0) return undefined;
  if (data.mode === 'tornado') {
    const widest = [...data.scenarios].sort(
      (a, b) => (b.high ?? 0) - (b.low ?? 0) - ((a.high ?? 0) - (a.low ?? 0)),
    )[0];
    if (!widest) return undefined;
    return `${widest.label} is the widest exposure, swinging ${value(
      (widest.high ?? 0) - (widest.low ?? 0),
      data.unit,
    )} around a ${value(data.baseline, data.unit)} base.`;
  }
  const worst = [...data.scenarios].sort((a, b) => a.value - b.value)[0];
  if (!worst) return undefined;
  return `Base case ${value(data.baseline, data.unit)}; the ${worst.label.toLowerCase()} case takes it to ${value(
    worst.value,
    data.unit,
  )}.`;
}

// ---------------------------------------------------------------------------

/**
 * One sentence stating what this panel shows, or `undefined` where the data is too thin
 * to say anything honest. Callers fall back to the catalogue's own description rather
 * than inventing a finding.
 */
export function findingFor(data: ChartData): string | undefined {
  switch (data.shape) {
    case 'timeSeries':
      return timeSeriesFinding(data);
    case 'breakdown':
      return breakdownFinding(data);
    case 'ranked':
      return rankedFinding(data);
    case 'matrix':
      return matrixFinding(data);
    case 'funnelSteps':
      return funnelFinding(data);
    case 'distribution':
      return distributionFinding(data);
    case 'flows':
      return flowsFinding(data);
    case 'scatterPoints':
      return scatterFinding(data);
    case 'gaugeSet':
      return gaugeFinding(data);
    case 'bulletRows':
      return bulletFinding(data);
    case 'tableRows':
      return tableFinding(data);
    case 'waterfallSteps':
      return waterfallFinding(data);
    case 'geoPoints':
      return geoFinding(data);
    case 'kpiSet':
      return kpiFinding(data);
    case 'scenarioSet':
      return scenarioFinding(data);
    default:
      return undefined;
  }
}
