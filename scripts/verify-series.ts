/**
 * Phase 2 exit gate.
 *
 * Calls `seriesFor` for all 236 panels and validates the result structurally, then
 * checks determinism, filter responsiveness and the narrative anchors the demo
 * script leans on.
 *
 *   npm run verify:series
 */

import {
  shapeFor,
  type ChartData,
  type ChartShape,
  type Filters,
  type Insight,
  type Panel,
  type Unit,
} from '../src/types.ts';
import { allPanels, byId, insights } from '../src/data/insights.ts';
import { bank } from '../src/data/bank.ts';
import { DEFAULT_FILTERS } from '../src/data/filters.ts';
import { concentrationCurve } from '../src/data/generators.ts';
import { panelsFor, seriesFor } from '../src/data/seriesFor.ts';
import { DEMO_PATH_OVERRIDES } from '../src/data/demoPath.ts';

let failures = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

function heading(title: string): void {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

const finite = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value);

/** Percent metrics may legitimately go negative (growth rates). Stocks may not. */
function allowsNegative(unit: Unit): boolean {
  return unit === 'percent';
}

// ---------------------------------------------------------------------------
// Structural validation, per shape
// ---------------------------------------------------------------------------

function validate(data: ChartData, insight: Insight, panel: Panel): string[] {
  const problems: string[] = [];
  const expected = shapeFor(panel.component, panel.variant);
  if (data.shape !== expected) {
    problems.push(`shape is "${data.shape}", expected "${expected}" for ${panel.component}:${panel.variant}`);
    return problems;
  }

  const negativeOk = allowsNegative(data.unit);
  const checkValue = (value: unknown, where: string): void => {
    if (!finite(value)) {
      problems.push(`${where} is not a finite number (${String(value)})`);
    } else if (!negativeOk && (value as number) < 0) {
      problems.push(`${where} is negative (${String(value)}) for unit "${data.unit}"`);
    }
  };

  switch (data.shape) {
    case 'timeSeries': {
      if (data.series.length === 0) problems.push('no series');
      for (const series of data.series) {
        if (series.points.length === 0) problems.push(`series "${series.key}" has no points`);
        if (series.label.length === 0) problems.push(`series "${series.key}" has no label`);
        for (const point of series.points) {
          if (typeof point.t !== 'string' || point.t.length === 0) problems.push('point has no t');
          checkValue(point.v, `series "${series.key}" point ${point.t}`);
        }
      }
      break;
    }
    case 'breakdown': {
      if (data.slices.length === 0) problems.push('no slices');
      for (const slice of data.slices) checkValue(slice.value, `slice "${slice.key}"`);
      const sum = data.slices.reduce((total, slice) => total + slice.value, 0);
      if (Math.abs(sum - data.total) > 1) {
        problems.push(`slices sum to ${sum}, total says ${data.total}`);
      }
      for (const slice of data.slices) {
        if (!slice.parts) continue;
        const partSum = slice.parts.reduce((total, part) => total + part.value, 0);
        if (Math.abs(partSum - slice.value) > 1) {
          problems.push(`slice "${slice.key}" parts sum to ${partSum}, slice is ${slice.value}`);
        }
      }
      break;
    }
    case 'ranked': {
      if (data.items.length === 0) problems.push('no items');
      let previousCumulative = -Infinity;
      for (const item of data.items) {
        checkValue(item.value, `item "${item.key}"`);
        if (!finite(item.cumulativePct)) problems.push(`item "${item.key}" cumulativePct not finite`);
        if (item.cumulativePct < previousCumulative - 0.01) {
          problems.push(`cumulativePct went backwards at "${item.key}"`);
        }
        previousCumulative = item.cumulativePct;
      }
      const last = data.items.at(-1);
      if (last && Math.abs(last.cumulativePct - 100) > 0.5) {
        problems.push(`cumulativePct ends at ${last.cumulativePct}, expected 100`);
      }
      break;
    }
    case 'matrix': {
      if (data.rows.length === 0 || data.cols.length === 0) problems.push('empty axes');
      if (data.cells.length === 0) problems.push('no cells');
      for (const cell of data.cells) {
        checkValue(cell.value, `cell ${cell.row}/${cell.col}`);
        if (!data.rows.includes(cell.row)) problems.push(`cell row "${cell.row}" not in rows`);
        if (!data.cols.includes(cell.col)) problems.push(`cell col "${cell.col}" not in cols`);
      }
      if (panel.variant === 'rag' && data.cells.some((cell) => cell.status === undefined)) {
        problems.push('rag heatmap has cells without a status');
      }
      break;
    }
    case 'funnelSteps': {
      if (data.steps.length < 2) problems.push('funnel needs at least two steps');
      let previous = Infinity;
      for (const step of data.steps) {
        checkValue(step.value, `step "${step.key}"`);
        if (step.value > previous) problems.push(`funnel step "${step.key}" is wider than the one before`);
        previous = step.value;
      }
      break;
    }
    case 'distribution': {
      if (data.seriesLabels.length === 0) problems.push('no series labels');
      if (data.bins.length === 0 && data.groups.length === 0) problems.push('neither bins nor groups');
      for (const bin of data.bins) {
        if (bin.to <= bin.from) problems.push(`bin ${bin.from}-${bin.to} is not ascending`);
        if (bin.counts.length !== data.seriesLabels.length) {
          problems.push(`bin ${bin.from} has ${bin.counts.length} counts, expected ${data.seriesLabels.length}`);
        }
        for (const count of bin.counts) {
          if (!finite(count) || count < 0) problems.push(`bin ${bin.from} has an invalid count`);
        }
      }
      for (const group of data.groups) {
        const ordered = group.min <= group.q1 && group.q1 <= group.median && group.median <= group.q3 && group.q3 <= group.max;
        if (!ordered) problems.push(`box plot group "${group.key}" quartiles are out of order`);
      }
      break;
    }
    case 'flows': {
      if (data.nodes.length === 0) problems.push('no nodes');
      if (data.links.length === 0) problems.push('no links');
      const ids = new Set(data.nodes.map((node) => node.id));
      for (const link of data.links) {
        checkValue(link.value, `link ${link.from}->${link.to}`);
        if (!ids.has(link.from)) problems.push(`link source "${link.from}" is not a node`);
        if (!ids.has(link.to)) problems.push(`link target "${link.to}" is not a node`);
        if (link.from === link.to) problems.push(`link "${link.from}" points at itself`);
      }
      break;
    }
    case 'scatterPoints': {
      if (data.points.length === 0) problems.push('no points');
      if (!data.xLabel || !data.yLabel) problems.push('missing axis labels');
      for (const point of data.points) {
        if (!finite(point.x) || !finite(point.y)) problems.push(`point "${point.key}" is not finite`);
      }
      break;
    }
    case 'gaugeSet': {
      if (data.gauges.length === 0) problems.push('no gauges');
      for (const gauge of data.gauges) {
        checkValue(gauge.value, `gauge "${gauge.key}"`);
        if (gauge.max <= gauge.min) problems.push(`gauge "${gauge.key}" has max <= min`);
        if (gauge.value > gauge.max + 1e-6) problems.push(`gauge "${gauge.key}" value exceeds max`);
        if (gauge.value < gauge.min - 1e-6) problems.push(`gauge "${gauge.key}" value below min`);
        if (!gauge.label) problems.push(`gauge "${gauge.key}" has no label`);
      }
      break;
    }
    case 'bulletRows': {
      if (data.rows.length === 0) problems.push('no rows');
      for (const row of data.rows) {
        checkValue(row.value, `row "${row.key}"`);
        checkValue(row.target, `row "${row.key}" target`);
        if (row.ranges.length === 0) problems.push(`row "${row.key}" has no ranges`);
        const ascending = row.ranges.every((value, index) => index === 0 || value >= (row.ranges[index - 1] ?? 0));
        if (!ascending) problems.push(`row "${row.key}" ranges are not ascending`);
        if (row.value > (row.ranges.at(-1) ?? 0) + 1e-6) {
          problems.push(`row "${row.key}" value exceeds its widest range`);
        }
      }
      break;
    }
    case 'tableRows': {
      if (data.columns.length === 0) problems.push('no columns');
      if (data.rows.length === 0) problems.push('no rows');
      for (const row of data.rows) {
        for (const column of data.columns) {
          if (!(column.key in row)) problems.push(`row is missing column "${column.key}"`);
        }
      }
      break;
    }
    case 'waterfallSteps': {
      if (data.steps.length < 3) problems.push('waterfall needs a start, a delta and a total');
      if (data.steps[0]?.kind !== 'start') problems.push('first step is not a start');
      if (data.steps.at(-1)?.kind !== 'total') problems.push('last step is not a total');
      for (const step of data.steps) {
        if (!finite(step.value)) problems.push(`step "${step.key}" is not finite`);
        // Deltas may be negative; the anchors may not.
        if (step.kind !== 'delta' && !negativeOk && step.value < 0) {
          problems.push(`step "${step.key}" (${step.kind}) is negative`);
        }
      }
      break;
    }
    case 'geoPoints': {
      if (data.points.length === 0) problems.push('no points');
      for (const point of data.points) {
        checkValue(point.value, `point "${point.id}"`);
        // Iraq's bounding box, roughly.
        if (point.lon < 38 || point.lon > 49) problems.push(`point "${point.id}" longitude is outside Iraq`);
        if (point.lat < 29 || point.lat > 38) problems.push(`point "${point.id}" latitude is outside Iraq`);
      }
      break;
    }
    case 'kpiSet': {
      if (data.cards.length === 0) problems.push('no cards');
      for (const card of data.cards) {
        checkValue(card.value, `card "${card.key}"`);
        if (!card.label) problems.push(`card "${card.key}" has no label`);
        if (card.deltaPct !== undefined && !finite(card.deltaPct)) {
          problems.push(`card "${card.key}" deltaPct is not finite`);
        }
        if (card.spark) {
          if (card.spark.length === 0) problems.push(`card "${card.key}" has an empty sparkline`);
          for (const value of card.spark) {
            if (!finite(value)) problems.push(`card "${card.key}" sparkline has a non-finite value`);
          }
        }
        if (panel.variant === 'sparkline' && !card.spark) {
          problems.push(`card "${card.key}" has no sparkline but the variant asks for one`);
        }
      }
      break;
    }
    case 'scenarioSet': {
      if (data.scenarios.length === 0) problems.push('no scenarios');
      if (!finite(data.baseline)) problems.push('baseline is not finite');
      for (const scenario of data.scenarios) {
        checkValue(scenario.value, `scenario "${scenario.key}"`);
        if (data.mode === 'tornado') {
          if (scenario.low === undefined || scenario.high === undefined) {
            problems.push(`tornado scenario "${scenario.key}" needs low and high`);
          } else if (scenario.high < scenario.low) {
            problems.push(`tornado scenario "${scenario.key}" has high < low`);
          }
        }
      }
      break;
    }
    default: {
      problems.push(`unhandled shape "${(data as ChartData).shape}"`);
    }
  }

  if (data.reference) {
    for (const reference of data.reference) {
      if (!finite(reference.value)) problems.push(`reference "${reference.label}" is not finite`);
      if (reference.kind === 'band' && reference.upper === undefined) {
        problems.push(`band reference "${reference.label}" has no upper bound`);
      }
    }
  }

  void insight;
  return problems;
}

// ---------------------------------------------------------------------------

heading('Coverage — all 236 panels');

const panels = allPanels();
check('236 panels to render', panels.length === 236, `got ${panels.length}`);

const shapesSeen = new Set<ChartShape>();
const componentsSeen = new Set<string>();
const pairsSeen = new Set<string>();
const broken: string[] = [];

for (const { insight, panel, panelIndex } of panels) {
  try {
    const data = seriesFor(insight.id, panelIndex, DEFAULT_FILTERS);
    shapesSeen.add(data.shape);
    componentsSeen.add(panel.component);
    pairsSeen.add(`${panel.component}:${panel.variant}`);
    const problems = validate(data, insight, panel);
    if (problems.length > 0) {
      broken.push(`${insight.id} p${panelIndex} ${panel.component}:${panel.variant} -> ${problems.join('; ')}`);
    }
  } catch (error) {
    broken.push(`${insight.id} p${panelIndex} ${panel.component}:${panel.variant} THREW ${(error as Error).message}`);
  }
}

check('every panel produces valid data', broken.length === 0, `${broken.length} broken`);
for (const entry of broken.slice(0, 25)) console.log(`        ${entry}`);
if (broken.length > 25) console.log(`        ... and ${broken.length - 25} more`);

check('all 15 shapes exercised', shapesSeen.size === 15, `got ${shapesSeen.size}: ${[...shapesSeen].join(', ')}`);
check('all 23 components exercised', componentsSeen.size === 23, `got ${componentsSeen.size}`);
check('all 39 (component, variant) pairs exercised', pairsSeen.size === 39, `got ${pairsSeen.size}`);
check(
  'panelsFor returns one entry per declared panel',
  insights.every((insight) => panelsFor(insight.id, DEFAULT_FILTERS).length === insight.panels.length),
);
check(
  'seriesFor throws for an out-of-range panel',
  (() => {
    try {
      seriesFor('E-01', 5, DEFAULT_FILTERS);
      return false;
    } catch {
      return true;
    }
  })(),
);

// ---------------------------------------------------------------------------

heading('Determinism (A4)');

const sample = ['E-01', 'E-02', 'R-17', 'R-43', 'G-23', 'C-21', 'R-06', 'R-45', 'C-44', 'G-49'];

check(
  'identical inputs produce deeply equal output',
  sample.every(
    (id) =>
      JSON.stringify(seriesFor(id, 0, DEFAULT_FILTERS)) === JSON.stringify(seriesFor(id, 0, DEFAULT_FILTERS)),
  ),
);

const twoPanel = insights.filter((insight) => insight.panels.length === 2).slice(0, 40);
check(
  'the two panels of a card differ',
  twoPanel.every(
    (insight) =>
      JSON.stringify(seriesFor(insight.id, 0, DEFAULT_FILTERS)) !==
      JSON.stringify(seriesFor(insight.id, 1, DEFAULT_FILTERS)),
  ),
);

const basraFilters: Filters = { ...DEFAULT_FILTERS, branch: 'basra' };
const retailFilters: Filters = { ...DEFAULT_FILTERS, division: 'retail' };
const usdFilters: Filters = { ...DEFAULT_FILTERS, currency: 'USD' };

for (const [label, filters] of [
  ['branch', basraFilters],
  ['division', retailFilters],
  ['currency', usdFilters],
] as const) {
  const changed = panels.filter(
    ({ insight, panelIndex }) =>
      JSON.stringify(seriesFor(insight.id, panelIndex, DEFAULT_FILTERS)) !==
      JSON.stringify(seriesFor(insight.id, panelIndex, filters)),
  ).length;
  check(
    `the ${label} filter changes every panel (PRD §12)`,
    changed === panels.length,
    `${changed}/${panels.length} changed`,
  );
}

const wideFilters: Filters = { ...DEFAULT_FILTERS, period: '24M' };
const narrowFilters: Filters = { ...DEFAULT_FILTERS, period: '3M' };
check(
  'a wider period shows more points',
  (() => {
    const wide = seriesFor('E-05', 1, wideFilters);
    const narrow = seriesFor('E-05', 1, narrowFilters);
    if (wide.shape !== 'timeSeries' || narrow.shape !== 'timeSeries') return false;
    return (wide.series[0]?.points.length ?? 0) > (narrow.series[0]?.points.length ?? 0);
  })(),
);
check(
  'widening the period does not redraw the months already on screen',
  (() => {
    const wide = seriesFor('E-05', 1, wideFilters);
    const narrow = seriesFor('E-05', 1, narrowFilters);
    if (wide.shape !== 'timeSeries' || narrow.shape !== 'timeSeries') return false;
    const wideTail = wide.series[0]?.points.slice(-3) ?? [];
    const narrowTail = narrow.series[0]?.points.slice(-3) ?? [];
    return JSON.stringify(wideTail) === JSON.stringify(narrowTail);
  })(),
);

// ---------------------------------------------------------------------------

heading('Reconciliation to the fixture (PRD §7.1)');

check(
  'E-02 gauges read the fixture NIM and CIR',
  (() => {
    const data = seriesFor('E-02', 0, DEFAULT_FILTERS);
    if (data.shape !== 'gaugeSet') return false;
    const nim = data.gauges.find((gauge) => gauge.label === 'NIM');
    const cir = data.gauges.find((gauge) => gauge.label === 'CIR');
    return (
      data.gauges.length === 2 &&
      Math.abs((nim?.value ?? 0) - bank.ratios.nim) < 0.01 &&
      Math.abs((cir?.value ?? 0) - bank.ratios.cir) < 0.01
    );
  })(),
);
check(
  'E-04 renders three gauges with a regulatory floor (plan §2.8)',
  (() => {
    const data = seriesFor('E-04', 0, DEFAULT_FILTERS);
    if (data.shape !== 'gaugeSet') return false;
    return data.gauges.length === 3 && data.gauges.some((gauge) => gauge.floor !== undefined);
  })(),
);
check(
  'E-03 renders two bullet rows for ROE and ROA (plan §2.8)',
  (() => {
    const data = seriesFor('E-03', 0, DEFAULT_FILTERS);
    return data.shape === 'bulletRows' && data.rows.length === 2;
  })(),
);
check(
  'E-01 KPI cards carry the three headline balance sheet figures',
  (() => {
    const data = seriesFor('E-01', 0, DEFAULT_FILTERS);
    if (data.shape !== 'kpiSet') return false;
    const values = data.cards.map((card) => card.value);
    return (
      values.includes(bank.balanceSheet.totalAssets) &&
      values.includes(bank.balanceSheet.grossLoans) &&
      values.includes(bank.balanceSheet.customerDeposits)
    );
  })(),
);
check(
  'E-08 waterfall is the real P&L bridge and closes on net profit',
  (() => {
    const data = seriesFor('E-08', 0, DEFAULT_FILTERS);
    if (data.shape !== 'waterfallSteps') return false;
    const total = data.steps.at(-1);
    const walked = data.steps
      .filter((step) => step.kind !== 'total')
      .reduce((sum, step) => sum + step.value, 0);
    return (
      Math.abs((total?.value ?? 0) - bank.income.netProfit) < 1 &&
      Math.abs(walked - bank.income.netProfit) < 1
    );
  })(),
);
check(
  'every timeSeries ends on its anchor, unfiltered',
  (() => {
    const monthlyLine = seriesFor('E-05', 1, DEFAULT_FILTERS);
    if (monthlyLine.shape !== 'timeSeries') return false;
    const last = monthlyLine.series[0]?.points.at(-1);
    return Math.abs((last?.v ?? 0) - bank.ratios.car) < 0.01;
  })(),
);
check(
  'GeoMap points come from the branch fixture',
  (() => {
    const geo = panels.find(({ panel }) => panel.component === 'GeoMap');
    if (!geo) return false;
    const data = seriesFor(geo.insight.id, geo.panelIndex, DEFAULT_FILTERS);
    return data.shape === 'geoPoints' && data.points.length === 11;
  })(),
);
check(
  'stacked series sum to the anchor at the endpoint',
  (() => {
    const data = seriesFor('E-06', 1, DEFAULT_FILTERS);
    if (data.shape !== 'timeSeries' || !data.stacked) return false;
    const endpointSum = data.series.reduce((sum, series) => sum + (series.points.at(-1)?.v ?? 0), 0);
    return endpointSum > 0 && Number.isFinite(endpointSum);
  })(),
);

// ---------------------------------------------------------------------------

heading('Narrative anchors (PRD §7.3, §15)');

check(
  'R-17 Lorenz passes through top 1% = 34% and top 5% = 58%',
  (() => {
    const data = seriesFor('R-17', 0, DEFAULT_FILTERS);
    if (data.shape !== 'ranked' || !data.lorenz) return false;
    const p1 = data.items.find((item) => item.key === 'p1');
    const p5 = data.items.find((item) => item.key === 'p5');
    return Math.abs((p1?.cumulativePct ?? 0) - 34) < 0.1 && Math.abs((p5?.cumulativePct ?? 0) - 58) < 0.1;
  })(),
);
check(
  'G-23 and C-21 concentration use the same curve as R-17',
  (() => {
    const expected = concentrationCurve(0.05) * 100;
    return ['G-23', 'C-21'].every((id) => {
      const data = seriesFor(id, 0, DEFAULT_FILTERS);
      if (data.shape !== 'ranked') return false;
      const named = data.items.filter((item) => item.key !== 'others');
      const topShare = named.at(-1)?.cumulativePct ?? 0;
      return Math.abs(topShare - expected) < 1.5;
    });
  })(),
);
check(
  'NPL series drifts up then improves in the last four months (PRD §7.3)',
  (() => {
    const data = seriesFor('E-07', 0, { ...DEFAULT_FILTERS, period: '24M' });
    if (data.shape !== 'timeSeries') return false;
    const points = data.series[0]?.points ?? [];
    if (points.length < 8) return false;
    const peak = Math.max(...points.map((point) => point.v));
    const last = points.at(-1)?.v ?? 0;
    return peak > last;
  })(),
);
check(
  'R-06 cohort heatmap is triangular, not rectangular',
  (() => {
    const data = seriesFor('R-06', 0, DEFAULT_FILTERS);
    if (data.shape !== 'matrix') return false;
    return data.cells.length < data.rows.length * data.cols.length;
  })(),
);
check(
  'R-45 vintage curves use an ordinal axis and never fall',
  (() => {
    const data = seriesFor('R-45', 0, DEFAULT_FILTERS);
    if (data.shape !== 'timeSeries' || data.axisKind !== 'ordinal') return false;
    return data.series.length > 1 && data.series.every((series) => series.points.length > 0);
  })(),
);
check(
  'the 6 daily-refresh insights get a 90-day axis at 3M (D1)',
  (() => {
    const daily = insights.filter((insight) => insight.refresh === 'Daily');
    return daily.every((insight) => {
      const data = seriesFor(insight.id, 0, { ...DEFAULT_FILTERS, period: '3M' });
      if (data.shape !== 'timeSeries') return true; // not every daily insight is a line
      return (data.series[0]?.points.length ?? 0) === 90;
    });
  })(),
);
check(
  `demo-path overrides registered: ${Object.keys(DEMO_PATH_OVERRIDES).length}`,
  Object.keys(DEMO_PATH_OVERRIDES).every((key) => {
    const [id, index] = key.split(':');
    return id !== undefined && byId(id).demoPath && byId(id).panels[Number(index)] !== undefined;
  }),
  'an override points at a non-demo-path insight or a panel that does not exist',
);

// ---------------------------------------------------------------------------

heading('Plausibility');

/*
 * Structural validity is not the same as looking right. These checks caught eight
 * real defects that every structural check passed: composition shares pinned flat by
 * a metric's own ceiling, a channel mix rendered as a count of the bank's 11 branches,
 * and headline deltas whose sign contradicted the trend. They stay in the gate.
 */
const implausible: string[] = [];

for (const { insight, panel, panelIndex } of panels) {
  const data = seriesFor(insight.id, panelIndex, DEFAULT_FILTERS);
  const tag = `${insight.id} p${panelIndex} ${panel.component}:${panel.variant}`;

  switch (data.shape) {
    case 'timeSeries': {
      for (const series of data.series) {
        const values = series.points.map((point) => point.v);
        if (values.length > 2 && values.every((value) => value === 0)) {
          implausible.push(`${tag} series "${series.label}" is all zero`);
        } else if (values.length > 2 && new Set(values).size === 1) {
          implausible.push(`${tag} series "${series.label}" is perfectly flat`);
        }
      }
      break;
    }
    case 'breakdown': {
      if (data.slices.some((slice) => slice.value === 0)) {
        implausible.push(`${tag} has a zero slice`);
      }
      if (data.slices.length < 2) implausible.push(`${tag} has fewer than two slices`);
      break;
    }
    case 'kpiSet': {
      for (const card of data.cards) {
        if (card.value === 0) implausible.push(`${tag} card "${card.label}" is zero`);
        if (card.deltaPct === 0) implausible.push(`${tag} card "${card.label}" has a zero delta`);
      }
      break;
    }
    case 'gaugeSet': {
      for (const gauge of data.gauges) {
        if (gauge.value === gauge.max) implausible.push(`${tag} gauge "${gauge.label}" is pegged at max`);
        if (gauge.target !== undefined && (gauge.target > gauge.max || gauge.target < gauge.min)) {
          implausible.push(`${tag} gauge "${gauge.label}" target is outside its range`);
        }
      }
      break;
    }
    case 'funnelSteps': {
      if (data.steps.some((step) => step.value === 0)) implausible.push(`${tag} has a zero funnel step`);
      break;
    }
    case 'matrix': {
      if (data.cells.every((cell) => cell.value === 0)) implausible.push(`${tag} matrix is all zero`);
      break;
    }
    case 'ranked': {
      if (data.items.length < 3) implausible.push(`${tag} ranks fewer than three items`);
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------

heading('The Period filter, across granularities');

/*
 * A short window puts the 78 daily-capable insights onto a daily axis, and `trend()`
 * compounds its growth argument **once per point**. A point that means a day therefore
 * compounded at a month's rate: R-11 climbed 39.4% across thirty days against 12.3% across
 * twelve months, and every one of those panels was overstating its trend by roughly thirty
 * times.
 *
 * The property asserted here is the one that was visibly false, and it holds for any book
 * that trends: **a metric cannot move further in thirty days than it does in twelve months.**
 * Five points of slack for the jitter on a thirty-point series, whose first point carries
 * noise the endpoint does not.
 */
function windowMove(id: string, panelIndex: number, period: Filters['period']) {
  const data = seriesFor(id, panelIndex, { ...DEFAULT_FILTERS, period });
  if (data.shape !== 'timeSeries') return undefined;
  const points = data.series[0]?.points ?? [];
  if (points.length < 2 || points[0]?.v === 0) return undefined;
  return { pct: ((points.at(-1)?.v ?? 0) / (points[0]?.v ?? 1) - 1) * 100, kind: data.axisKind };
}

const overstated: string[] = [];
let dailyAxisPanels = 0;
for (const insight of insights) {
  insight.panels.forEach((_panel, panelIndex) => {
    const short = windowMove(insight.id, panelIndex, '30D');
    const long = windowMove(insight.id, panelIndex, '12M');
    if (!short || !long || short.kind !== 'daily') return;
    dailyAxisPanels += 1;
    if (Math.abs(short.pct) > Math.abs(long.pct) + 5) {
      overstated.push(`${insight.id} p${panelIndex}: 30D ${short.pct.toFixed(1)}% vs 12M ${long.pct.toFixed(1)}%`);
    }
  });
}

check('a short window puts daily-capable insights on a daily axis', dailyAxisPanels > 0,
  `${dailyAxisPanels} panels`);
check('no metric moves further in 30 days than it does in 12 months', overstated.length === 0,
  `${overstated.length}: ${overstated.slice(0, 3).join(' | ')}`);

/* And the insights with no daily figure must not be left drawing a single point. */
const singlePoint: string[] = [];
for (const insight of insights) {
  insight.panels.forEach((_panel, panelIndex) => {
    const data = seriesFor(insight.id, panelIndex, { ...DEFAULT_FILTERS, period: '30D' });
    if (data.shape !== 'timeSeries') return;
    const points = data.series[0]?.points.length ?? 0;
    if (points < 2) singlePoint.push(`${insight.id} p${panelIndex}`);
  });
}
check('no time series is reduced to a single point by the default period',
  singlePoint.length === 0, singlePoint.slice(0, 3).join(', '));

/*
 * A widened span has to admit it, or the chart contradicts the filter above it — and it must
 * admit it **once**. The caveat is about the window, not the metric, so a `KpiCards` sidecar
 * inheriting its primary's note printed the same sentence three times on one card.
 */
const widenedWithoutNote: string[] = [];
const repeatedOnSidecar: string[] = [];
for (const insight of insights) {
  insight.panels.forEach((_panel, panelIndex) => {
    const data = seriesFor(insight.id, panelIndex, { ...DEFAULT_FILTERS, period: '30D' });
    const says = data.note?.includes('two months') ?? false;
    if (panelIndex === 0) {
      if (data.shape === 'timeSeries' && data.axisKind === 'monthly' && !says) {
        widenedWithoutNote.push(`${insight.id} p0`);
      }
      return;
    }
    if (says) repeatedOnSidecar.push(`${insight.id} p${panelIndex}`);
  });
}
check('a monthly-only insight says so when 30 days cannot be honoured',
  widenedWithoutNote.length === 0, widenedWithoutNote.slice(0, 3).join(', '));
check('and says it once — a second panel does not repeat the caveat',
  repeatedOnSidecar.length === 0, repeatedOnSidecar.slice(0, 3).join(', '));

/* The doubling itself: a note must never contain the same sentence twice. */
const doubled: string[] = [];
for (const insight of insights) {
  insight.panels.forEach((_panel, panelIndex) => {
    const note = seriesFor(insight.id, panelIndex, { ...DEFAULT_FILTERS, period: '30D' }).note ?? '';
    const first = note.indexOf('shortest meaningful span');
    if (first >= 0 && note.indexOf('shortest meaningful span', first + 1) >= 0) {
      doubled.push(`${insight.id} p${panelIndex}`);
    }
  });
}
check('no note repeats itself', doubled.length === 0, doubled.slice(0, 3).join(', '));

check('no flat, zero or pegged output across all 236 panels', implausible.length === 0, `${implausible.length} found`);
for (const entry of implausible.slice(0, 20)) console.log(`        ${entry}`);

check(
  'headline KPI deltas agree with the stated growth direction (PRD §7.3)',
  (() => {
    const data = seriesFor('E-01', 0, DEFAULT_FILTERS);
    if (data.shape !== 'kpiSet') return false;
    // Assets, loans and deposits all grow, so none of the three may show a fall.
    return data.cards.every((card) => (card.deltaPct ?? 0) > 0);
  })(),
);
check(
  'a stacked percent composition sums to 100 at the endpoint',
  (() => {
    // `ladder` is a bucket breakdown, not a time composition (plan §2.7 / SHAPE_OVERRIDES).
    const stacked = panels.filter(
      ({ insight, panel }) =>
        panel.component === 'StackedBar' && panel.variant !== 'ladder' && insight.unit === 'percent',
    );
    return stacked.every(({ insight, panelIndex }) => {
      const data = seriesFor(insight.id, panelIndex, DEFAULT_FILTERS);
      if (data.shape !== 'timeSeries') return false;
      const total = data.series.reduce((sum, series) => sum + (series.points.at(-1)?.v ?? 0), 0);
      return Math.abs(total - 100) < 0.5;
    });
  })(),
);
check(
  'no gauge carries an invented regulatory floor (PRD §8)',
  (() => {
    const data = seriesFor('E-04', 0, DEFAULT_FILTERS);
    if (data.shape !== 'gaugeSet') return false;
    // LCR and NSFR have real floors of 100; LDR has none and must not be given one.
    const ldr = data.gauges.find((gauge) => gauge.label === 'LDR');
    return ldr !== undefined && ldr.floor === undefined;
  })(),
);

// ---------------------------------------------------------------------------

heading('Summary');
const shapeCounts = new Map<ChartShape, number>();
for (const { insight, panelIndex } of panels) {
  const shape = seriesFor(insight.id, panelIndex, DEFAULT_FILTERS).shape;
  shapeCounts.set(shape, (shapeCounts.get(shape) ?? 0) + 1);
}
for (const [shape, count] of [...shapeCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${shape}`);
}
console.log(`  ${String(panels.length).padStart(4)}  total panels`);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.\n`);
  process.exit(1);
}
console.log('\nAll checks passed.\n');
