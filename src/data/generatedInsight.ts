/**
 * The reading behind **Generate Insights** (plan §5, Phase 10).
 *
 * `finding.ts` says what the numbers are doing in one line. This says what follows from
 * it: four beats — *what is happening → why it matters → what to do → what to watch* —
 * so a reader who stops after the headline still has the takeaway.
 *
 * ## Two rules do most of the work
 *
 * **Every finding carries a figure**, read from the `ChartData` the panel actually drew.
 * A claim with no number attached cannot be emitted, which is the whole defence against
 * confident vapour — and, as in `finding.ts`, it means a reading cannot contradict the
 * chart beside it.
 *
 * **Rank, never pad.** Two sharp findings beat five flat ones, so a visitor that can only
 * say one true thing says one thing. The caps in this file's types are real: `verify:insights`
 * fails the build on a headline over twelve words or a finding over twenty.
 *
 * ## What is not in the data
 *
 * Nothing in a series knows who owns the fix. The consequence and the lever come from
 * `insightThemes.ts`, keyed on the section; the figures come from here. Keeping the two
 * apart is what stops the generator inventing a number to justify an action.
 */

import {
  type BreakdownData,
  type BulletData,
  type ChartData,
  type DistributionData,
  type Filters,
  type FlowsData,
  type FunnelData,
  type GaugeSetData,
  type GeoData,
  type Insight,
  type KpiData,
  type MatrixData,
  type RankedData,
  type ScatterData,
  type ScenarioData,
  type TableData,
  type TimeSeriesData,
  type Unit,
  type WaterfallData,
} from '../types.ts';
import { formatDelta, formatPercent } from '../design/format.ts';
import { isDownGood } from './anchors.ts';
import { change, gap, share, value } from './figures.ts';
import { describeFilters } from './filters.ts';
import { themeFor, type Horizon } from './insightThemes.ts';

// ---------------------------------------------------------------------------
// The shape of a reading
// ---------------------------------------------------------------------------

export type Verdict = 'positive' | 'watch' | 'negative' | 'neutral';
export type Confidence = 'high' | 'medium' | 'low';

export interface Finding {
  /** One claim, at most 20 words. */
  readonly text: string;
  /** The figure that proves it — `NIM 3.28% vs 3.30% plan, −2bp`. Never empty. */
  readonly evidence: string;
}

export interface Action {
  /** Imperative, verb first. */
  readonly text: string;
  readonly horizon: Horizon;
  readonly owner: string;
}

export interface GeneratedInsight {
  /** The single takeaway, at most 12 words. */
  readonly headline: string;
  readonly verdict: Verdict;
  /** Two or three, ranked by importance. Never padded to fill. */
  readonly findings: readonly Finding[];
  /** One sentence: the business consequence. */
  readonly soWhat: string;
  /** One to three, each with a horizon and an owner. Never empty. */
  readonly actions: readonly Action[];
  /** The metric and threshold that would change the verdict. */
  readonly watchNext?: string;
  readonly confidence: Confidence;
  /** Only ever set when `confidence` is not `high`. */
  readonly caveat?: string;
  /**
   * The slice this reading describes, in the reader's words.
   *
   * Not in the four beats, and load-bearing anyway: the panel is non-modal, so the reader
   * can change a filter while it is open. This is their proof that the words in front of
   * them belong to the chart beside them — the same job the I3 chips do on a report block.
   */
  readonly scope: string;
}

/** What a shape visitor knows. The composer turns it into the four beats. */
interface Reading {
  /** Assembled left to right, dropping trailing parts until the cap is met. */
  readonly headline: readonly string[];
  readonly verdict: Verdict;
  readonly findings: readonly Finding[];
  /** What the story is about — a noun phrase, used in the consequence and the watch line. */
  readonly subject: string;
  /** Where the data names its own threshold, it beats the theme's generic one. */
  readonly watchNext?: string;
}

export const HEADLINE_MAX_WORDS = 12;
export const FINDING_MAX_WORDS = 20;

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * The headline, assembled from parts rather than truncated.
 *
 * A label can be any length — the generators build them from the dimension tables — so a
 * fixed template can run past twelve words on one insight and not on another. Dropping a
 * whole clause keeps the sentence grammatical; cutting at the twelfth word would not.
 */
function headlineOf(parts: readonly string[]): string {
  let text = '';
  for (const part of parts) {
    const next = text ? `${text} ${part}` : part;
    if (words(next) > HEADLINE_MAX_WORDS) break;
    text = next;
  }
  return text || (parts[0] ?? 'No reading available');
}

function fact(text: string, evidence: string): Finding {
  return { text, evidence };
}

/** A sentence opens with a capital, whatever the label handed to it looked like. */
function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// The fifteen shapes
// ---------------------------------------------------------------------------

function timeSeriesReading(data: TimeSeriesData, downIsGood: boolean): Reading | undefined {
  const primary = data.series[0];
  const points = primary?.points ?? [];
  if (!primary || points.length < 2) return undefined;

  const first = points[0]?.v ?? 0;
  const last = points.at(-1)?.v ?? 0;
  const movement = change(first, last) ?? 0;
  const span = `${points.length} ${data.axisKind === 'daily' ? 'days' : 'months'}`;
  const target = data.reference?.find((r) => r.kind === 'target');
  const floor = data.reference?.find((r) => r.kind === 'floor');
  const findings: Finding[] = [];

  let verdict: Verdict = 'neutral';
  let watchNext: string | undefined;

  if (floor) {
    // A floor is a floor whichever way the metric is meant to move: below it is a breach.
    const clear = last >= floor.value;
    verdict = clear ? 'positive' : 'negative';
    findings.push(
      fact(
        clear
          ? `${primary.label} clear of its regulatory floor`
          : `${primary.label} below its regulatory floor`,
        `${value(last, data.unit)} against a ${value(floor.value, data.unit)} floor, ${gap(last, floor.value, data.unit)} ${clear ? 'clear' : 'short'}`,
      ),
    );
    watchNext = `${primary.label} within ${gap(floor.value * 1.05, floor.value, data.unit)} of the ${value(floor.value, data.unit)} floor.`;
  } else if (target) {
    /*
     * Which side of the target is the good side depends on the metric, not on the sign.
     * Without this an NPL ratio at 15.8% against a 5% target reads as "ahead of plan" —
     * which is how the first run of this generator described the worst number on the page.
     */
    const met = downIsGood ? last <= target.value : last >= target.value;
    verdict = met ? 'positive' : 'watch';
    findings.push(
      fact(
        met ? `${primary.label} the right side of plan` : `${primary.label} the wrong side of plan`,
        `${value(last, data.unit)} against a ${value(target.value, data.unit)} target, ${gap(last, target.value, data.unit)} ${last >= target.value ? 'above' : 'below'}`,
      ),
    );
    watchNext = `${primary.label} still ${met ? 'off' : 'the wrong side of'} the ${value(target.value, data.unit)} target next month.`;
  }

  // The movement itself, always — it is the one thing a time series can always say.
  const flat = Math.abs(movement) < 0.05;
  const rose = movement > 0;
  findings.push(
    fact(
      flat
        ? `${primary.label} flat across the window`
        : `${primary.label} ${rose ? 'higher' : 'lower'} across the window`,
      `${value(first, data.unit)} → ${value(last, data.unit)}, ${formatDelta(movement)} over ${span}`,
    ),
  );

  // A composition is about the mix, so the largest band earns the third line.
  if (data.stacked && data.series.length > 1) {
    const totals = data.series.map((s) => ({ label: s.label, v: s.points.at(-1)?.v ?? 0 }));
    const total = totals.reduce((sum, t) => sum + t.v, 0);
    const biggest = [...totals].sort((a, b) => b.v - a.v)[0];
    if (biggest && total > 0) {
      findings.push(
        fact(
          `${biggest.label} the largest single component of the total`,
          `${value(biggest.v, data.unit)} of ${value(total, data.unit)}, ${formatPercent(share(biggest.v, total))}`,
        ),
      );
    }
  } else if (points.length >= 4) {
    // Is the movement recent, or was it all earlier? A reader asks this next.
    const half = Math.floor(points.length / 2);
    const mid = points[half]?.v ?? first;
    const recent = change(mid, last);
    const earlier = change(first, mid);
    if (recent !== undefined && earlier !== undefined && Math.abs(recent - earlier) > 1) {
      findings.push(
        fact(
          recent > earlier
            ? 'The movement is accelerating in the more recent half of the window'
            : 'The movement has eased in the more recent half of the window',
          `${formatDelta(earlier)} in the first half against ${formatDelta(recent)} in the second`,
        ),
      );
    }
  }

  /*
   * Where the metric has no target, the direction alone is not a verdict — but which way
   * is good still is. A rising cost line and a rising deposit line are not the same news.
   */
  if (verdict === 'neutral' && !flat && Math.abs(movement) >= 2) {
    const adverse = downIsGood ? rose : !rose;
    verdict = adverse ? 'watch' : 'positive';
  }

  return {
    headline: [
      flat
        ? `${primary.label} flat over ${span}`
        : `${primary.label} ${rose ? 'up' : 'down'} ${formatPercent(Math.abs(movement))} over ${span}`,
    ],
    verdict,
    findings: findings.slice(0, 3),
    subject: primary.label,
    ...(watchNext ? { watchNext } : {}),
  };
}

function breakdownReading(data: BreakdownData): Reading | undefined {
  if (data.slices.length === 0) return undefined;
  const ranked = [...data.slices].sort((a, b) => b.value - a.value);
  const top = ranked[0];
  if (!top) return undefined;
  const total = data.total || ranked.reduce((sum, s) => sum + s.value, 0);
  const topTwo = ranked.slice(0, 2).reduce((sum, s) => sum + s.value, 0);
  const topShare = share(top.value, total);
  const smallest = ranked.at(-1);

  const findings: Finding[] = [
    fact(
      `${top.label} the largest share of the total`,
      `${value(top.value, data.unit)} of ${value(total, data.unit)}, ${formatPercent(topShare)}`,
    ),
    fact(
      ranked.length > 2
        ? 'The top two together carry most of the concentration'
        : 'The split is between two components',
      `${formatPercent(share(topTwo, total))} of the total across ${ranked.length} components`,
    ),
  ];
  if (smallest && ranked.length > 3 && smallest.value > 0) {
    findings.push(
      fact(
        `${smallest.label} contributes least, and may not be worth the attention it takes`,
        `${value(smallest.value, data.unit)}, ${formatPercent(share(smallest.value, total))} of the total`,
      ),
    );
  }

  // Concentration is the risk a breakdown carries; half the book in one slice is the line.
  const verdict: Verdict = topShare >= 50 ? 'watch' : 'neutral';
  return {
    headline: [`${top.label} carries ${formatPercent(topShare)} of the total`],
    verdict,
    findings: findings.slice(0, 3),
    subject: top.label,
    watchNext: `${top.label} rising above ${formatPercent(Math.min(75, Math.ceil(topShare / 5) * 5 + 5))} of the total.`,
  };
}

function rankedReading(data: RankedData): Reading | undefined {
  if (data.items.length === 0) return undefined;
  const top = data.items[0];
  if (!top) return undefined;

  if (data.lorenz) {
    const p1 = data.items.find((i) => i.key === 'p1');
    const p5 = data.items.find((i) => i.key === 'p5');
    const p10 = data.items.find((i) => i.key === 'p10');
    if (p1 && p5) {
      const findings: Finding[] = [
        fact(
          'The book is concentrated in a very small number of customers',
          `the top 1% hold ${formatPercent(p1.cumulativePct)} of the total`,
        ),
        fact(
          'Widening the group barely changes the picture',
          `the top 5% hold ${formatPercent(p5.cumulativePct)}${p10 ? `, the top 10% ${formatPercent(p10.cumulativePct)}` : ''}`,
        ),
      ];
      if (data.basis) {
        findings.push(
          fact(
            `Measured across the ${data.basis.label.toLowerCase()} this curve is drawn over`,
            `${value(data.basis.value, data.basis.unit)}`,
          ),
        );
      }
      return {
        headline: [`Top 1% of customers hold ${formatPercent(p1.cumulativePct)} of deposits`],
        verdict: p1.cumulativePct >= 25 ? 'watch' : 'neutral',
        findings,
        subject: 'Deposit concentration',
        watchNext: `The top 1% share rising above ${formatPercent(Math.ceil(p1.cumulativePct / 5) * 5 + 5)}.`,
      };
    }
  }

  const toEighty = data.items.findIndex((i) => i.cumulativePct >= 80);
  const count = toEighty >= 0 ? toEighty + 1 : data.items.length;
  const tail = data.items.slice(count);
  const total = data.total || data.items.reduce((sum, i) => sum + i.value, 0);
  const topShare = share(top.value, total);

  /*
   * A Pareto only says something when the eighty per cent arrives early. Where it takes
   * nearly every item on the axis to get there, the finding is the opposite one — the book
   * is evenly spread — and the first draft of this generator reported "11 of 11 carry four
   * fifths of the total", which is arithmetic dressed up as an insight.
   */
  const concentrated = count <= Math.max(2, Math.ceil(data.items.length * 0.4));

  const findings: Finding[] = [
    fact(
      `${top.label} leads the ranking`,
      `${value(top.value, data.unit)}, ${formatPercent(topShare)} of the total`,
    ),
    concentrated
      ? fact(
          `${count} of ${data.items.length} account for four fifths of the total`,
          `${formatPercent(data.items[count - 1]?.cumulativePct ?? 80)} cumulative at position ${count}`,
        )
      : fact(
          'No single name dominates — the total is spread across the field',
          `it takes ${count} of ${data.items.length} to reach four fifths`,
        ),
  ];
  if (tail.length > 1) {
    const tailValue = tail.reduce((sum, i) => sum + i.value, 0);
    findings.push(
      fact(
        `The remaining ${tail.length} contribute little between them`,
        `${value(tailValue, data.unit)}, ${formatPercent(share(tailValue, total))} of the total`,
      ),
    );
  }

  return {
    headline: concentrated
      ? [`${count} of ${data.items.length} carry four fifths of the total`]
      : [`The total is spread evenly across ${data.items.length} names`],
    verdict: concentrated ? 'watch' : 'neutral',
    findings: findings.slice(0, 3),
    subject: concentrated ? top.label : 'the top names',
  };
}

function gaugeReading(data: GaugeSetData): Reading | undefined {
  if (data.gauges.length === 0) return undefined;

  const readings = data.gauges.map((g) => {
    const breached = g.floor !== undefined && g.value < g.floor;
    const offPlan =
      g.target !== undefined && (g.downIsGood ? g.value > g.target : g.value < g.target);
    const reference = g.floor ?? g.target;
    return { gauge: g, breached, offPlan, reference };
  });

  // Rank by what is wrong: a breach first, then a miss, then the rest.
  const ranked = [...readings].sort(
    (a, b) => Number(b.breached) - Number(a.breached) || Number(b.offPlan) - Number(a.offPlan),
  );
  const lead = ranked[0];
  if (!lead) return undefined;

  const findings = ranked.slice(0, 3).map(({ gauge: g, breached, offPlan }) => {
    if (g.floor !== undefined) {
      return fact(
        breached
          ? `${g.label} below the regulatory minimum`
          : `${g.label} clear of its regulatory minimum`,
        `${value(g.value, data.unit)} against a ${value(g.floor, data.unit)} floor, ${gap(g.value, g.floor, data.unit)} ${breached ? 'short' : 'clear'}`,
      );
    }
    if (g.target !== undefined) {
      return fact(
        offPlan ? `${g.label} the wrong side of plan` : `${g.label} on or better than plan`,
        `${value(g.value, data.unit)} vs ${value(g.target, data.unit)} plan, ${gap(g.value, g.target, data.unit)} ${offPlan ? 'off' : 'better'}`,
      );
    }
    return fact(`${g.label} carries no target to read it against`, value(g.value, data.unit));
  });

  /*
   * Red means a floor has been crossed, never a target missed — plan §2.12. A gauge 15%
   * off a target reads as drift, and colouring it as a breach is what made LDR look like
   * a regulatory event in Phase 3.
   */
  const verdict: Verdict = lead.breached
    ? 'negative'
    : ranked.some((r) => r.offPlan)
      ? 'watch'
      : 'positive';

  const label = lead.gauge.label;
  return {
    headline: lead.breached
      ? [`${label} below its regulatory floor`]
      : lead.offPlan
        ? [`${label} off plan by ${gap(lead.gauge.value, lead.gauge.target ?? 0, data.unit)}`]
        : [`${label} and the rest on plan`],
    verdict,
    findings,
    subject: label,
    ...(lead.reference !== undefined
      ? {
          watchNext: `${label} moving past ${value(lead.reference, data.unit)}${lead.gauge.floor !== undefined ? ', its regulatory floor' : ', its plan'}.`,
        }
      : {}),
  };
}

function bulletReading(data: BulletData, downIsGood: boolean): Reading | undefined {
  if (data.rows.length === 0) return undefined;
  // Distance from plan, signed so negative is always the bad side of it.
  const distance = (r: { value: number; target: number }): number =>
    downIsGood ? r.target - r.value : r.value - r.target;
  const ranked = [...data.rows].sort((a, b) => distance(a) - distance(b));
  const worst = ranked[0];
  const best = ranked.at(-1);
  if (!worst || !best) return undefined;

  const findings: Finding[] = ranked.slice(0, 3).map((r) =>
    fact(
      distance(r) >= 0 ? `${r.label} at or ahead of plan` : `${r.label} short of plan`,
      `${value(r.value, data.unit)} vs ${value(r.target, data.unit)} plan, ${gap(r.value, r.target, data.unit)} ${distance(r) >= 0 ? 'ahead' : 'short'}`,
    ),
  );

  const anyShort = distance(worst) < 0;
  return {
    headline: anyShort
      ? [`${worst.label} ${gap(worst.value, worst.target, data.unit)} short of plan`]
      : [`${best.label} and the rest at plan`],
    verdict: anyShort ? 'watch' : 'positive',
    findings,
    subject: anyShort ? worst.label : best.label,
    watchNext: `${worst.label} still short of ${value(worst.target, data.unit)} at month end.`,
  };
}

function kpiReading(data: KpiData): Reading | undefined {
  const cards = data.cards;
  if (cards.length === 0) return undefined;

  const moving = cards.filter((c) => c.deltaPct !== undefined);
  // Rank by how badly a tile is moving in the direction that is bad for it.
  const scored = moving.map((c) => {
    const delta = c.deltaPct ?? 0;
    const adverse = c.downIsGood ? delta > 0 : delta < 0;
    return { card: c, delta, adverse, weight: (adverse ? 1 : -1) * Math.abs(delta) };
  });
  const ranked = [...scored].sort((a, b) => b.weight - a.weight);
  const lead = ranked[0];

  if (!lead) {
    const first = cards[0];
    if (!first) return undefined;
    return {
      headline: [`${first.label} at ${value(first.value, first.unit)}`],
      verdict: 'neutral',
      findings: [fact(`${first.label} carries the headline figure on this card`, value(first.value, first.unit))],
      subject: first.label,
    };
  }

  const findings = ranked
    .slice(0, 3)
    .map(({ card, delta, adverse }) =>
      fact(
        `${card.label} is moving ${adverse ? 'the wrong way' : 'the right way'} month on month`,
        `${value(card.value, card.unit)}, ${formatDelta(delta)} MoM`,
      ),
    );

  const adverseCount = scored.filter((s) => s.adverse).length;
  return {
    headline: lead.adverse
      ? [`${lead.card.label} ${formatDelta(lead.delta)} month on month`]
      : [`${lead.card.label} improving at ${formatDelta(lead.delta)}`],
    verdict: lead.adverse ? (Math.abs(lead.delta) >= 5 ? 'watch' : 'neutral') : 'positive',
    findings,
    subject: lead.card.label,
    watchNext:
      adverseCount > 0
        ? `${lead.card.label} moving further than ${formatPercent(Math.abs(lead.delta))} next month.`
        : `${lead.card.label} turning negative month on month.`,
  };
}

function waterfallReading(data: WaterfallData): Reading | undefined {
  const start = data.steps[0];
  const end = data.steps.at(-1);
  const deltas = data.steps.filter((s) => s.kind === 'delta');
  if (!start || !end || deltas.length === 0) return undefined;

  const drags = [...deltas].filter((d) => d.value < 0).sort((a, b) => a.value - b.value);
  const lifts = [...deltas].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const net = change(start.value, end.value);

  const findings: Finding[] = [];
  if (lifts[0]) {
    findings.push(
      fact(
        `${lifts[0].label} the largest contribution in the bridge`,
        `${value(lifts[0].value, data.unit)} added`,
      ),
    );
  }
  if (drags[0]) {
    findings.push(
      fact(
        `${drags[0].label} takes the most out of it`,
        `${value(Math.abs(drags[0].value), data.unit)} against`,
      ),
    );
  }
  findings.push(
    fact(
      net !== undefined && net < 0 ? 'The bridge closes lower than it opened' : 'The bridge closes higher than it opened',
      `${value(start.value, data.unit)} → ${value(end.value, data.unit)}${net !== undefined ? `, ${formatDelta(net)}` : ''}`,
    ),
  );

  const subject = drags[0]?.label ?? lifts[0]?.label ?? end.label;
  return {
    headline: [
      drags[0]
        ? `${drags[0].label} the largest drag on the bridge`
        : `${end.label} closes at ${value(end.value, data.unit)}`,
    ],
    verdict: net !== undefined && net < 0 ? 'watch' : 'neutral',
    findings: findings.slice(0, 3),
    subject,
  };
}

function funnelReading(data: FunnelData): Reading | undefined {
  const first = data.steps[0];
  const last = data.steps.at(-1);
  if (!first || !last || data.steps.length < 2) return undefined;
  const worst = [...data.steps.slice(1)].sort((a, b) => a.conversionPct - b.conversionPct)[0];
  const endToEnd = share(last.value, first.value);

  const findings: Finding[] = [
    fact(
      `The steepest drop lands on ${worst?.label.toLowerCase() ?? 'the next stage'}`,
      `${formatPercent(worst?.conversionPct ?? 0)} of the stage before it carries through`,
    ),
    fact(
      `End to end, most of the population is lost before the last stage`,
      `${value(first.value, data.unit)} → ${value(last.value, data.unit)}, ${formatPercent(endToEnd)}`,
    ),
  ];
  if (worst) {
    const lost = (data.steps[data.steps.indexOf(worst) - 1]?.value ?? 0) - worst.value;
    if (lost > 0) {
      findings.push(
        fact(
          `Recovering that one stage is worth more than anything downstream`,
          `${value(lost, data.unit)} lost at ${worst.label.toLowerCase()} alone`,
        ),
      );
    }
  }

  return {
    headline: [`${worst?.label ?? 'One stage'} is where the funnel loses most`],
    verdict: (worst?.conversionPct ?? 100) < 60 ? 'watch' : 'neutral',
    findings: findings.slice(0, 3),
    subject: worst?.label ?? first.label,
    watchNext: `Conversion into ${worst?.label.toLowerCase() ?? 'the weakest stage'} falling below ${formatPercent(Math.max(0, (worst?.conversionPct ?? 0) - 5))}.`,
  };
}

function matrixReading(data: MatrixData): Reading | undefined {
  if (data.cells.length === 0) return undefined;
  const rag = data.cells.filter((c) => c.status !== undefined);

  if (rag.length > 0) {
    const red = rag.filter((c) => c.status === 'red');
    const amber = rag.filter((c) => c.status === 'amber');
    const findings: Finding[] = [
      fact(
        red.length > 0 ? 'Indicators are outside limit and need clearing' : 'Every indicator is inside limit',
        `${red.length} breaching, ${amber.length} on watch, of ${rag.length}`,
      ),
    ];
    const worst = red[0] ?? amber[0];
    if (worst) {
      findings.push(
        fact(
          `${worst.row} at ${worst.col} is the one to take first`,
          `${value(worst.value, data.unit)}, flagged ${worst.status}`,
        ),
      );
    }
    const rowsAffected = new Set([...red, ...amber].map((c) => c.row));
    if (rowsAffected.size > 1) {
      findings.push(
        fact(
          'The problem is spread across several rows rather than isolated',
          `${rowsAffected.size} of ${data.rows.length} rows carry a flag`,
        ),
      );
    }
    return {
      headline:
        red.length > 0
          ? [`${red.length} indicator${red.length === 1 ? '' : 's'} outside limit`]
          : amber.length > 0
            ? [`${amber.length} indicator${amber.length === 1 ? '' : 's'} on watch`]
            : ['Every indicator inside limit'],
      verdict: red.length > 0 ? 'negative' : amber.length > 0 ? 'watch' : 'positive',
      findings: findings.slice(0, 3),
      subject: worst ? `${worst.row}` : 'The indicator set',
    };
  }

  const ranked = [...data.cells].sort((a, b) => b.value - a.value);
  const hottest = ranked[0];
  const coldest = ranked.at(-1);
  if (!hottest) return undefined;
  const total = data.cells.reduce((sum, c) => sum + c.value, 0);
  const findings: Finding[] = [
    fact(
      `Concentration is heaviest in ${hottest.row} at ${hottest.col}`,
      `${value(hottest.value, data.unit)}, ${formatPercent(share(hottest.value, total))} of the grid`,
    ),
  ];
  if (coldest && coldest !== hottest) {
    findings.push(
      fact(
        `${coldest.row} at ${coldest.col} the thinnest cell on the grid`,
        `${value(coldest.value, data.unit)} against ${value(hottest.value, data.unit)} at the top`,
      ),
    );
  }
  return {
    headline: [`${hottest.row} at ${hottest.col} is the heaviest cell`],
    verdict: 'neutral',
    findings,
    subject: hottest.row,
  };
}

function flowsReading(data: FlowsData): Reading | undefined {
  if (data.links.length === 0) return undefined;
  const label = new Map(data.nodes.map((n) => [n.id, n.label]));
  const ranked = [...data.links].sort((a, b) => b.value - a.value);
  const biggest = ranked[0];
  if (!biggest) return undefined;
  const total = data.links.reduce((sum, l) => sum + l.value, 0);
  const from = label.get(biggest.from) ?? biggest.from;
  const to = label.get(biggest.to) ?? biggest.to;

  const findings: Finding[] = [
    fact(
      `The largest flow runs from ${from} to ${to}`,
      `${value(biggest.value, data.unit)}, ${formatPercent(share(biggest.value, total))} of everything moving`,
    ),
    fact(
      `The top three flows carry most of the movement`,
      `${formatPercent(share(ranked.slice(0, 3).reduce((s, l) => s + l.value, 0), total))} of ${value(total, data.unit)}`,
    ),
  ];

  return {
    headline: [`${from} to ${to} is the largest flow`],
    verdict: share(biggest.value, total) >= 40 ? 'watch' : 'neutral',
    findings,
    subject: `${from} to ${to}`,
  };
}

function scatterReading(data: ScatterData): Reading | undefined {
  if (data.points.length < 3) return undefined;
  const x = data.quadrantX;
  const y = data.quadrantY;

  if (x !== undefined && y !== undefined) {
    const favourable = data.points.filter((p) => p.x >= x && p.y >= y);
    const exposed = data.points.filter((p) => p.x >= x && p.y < y);
    const worst = [...exposed].sort((a, b) => b.x - a.x)[0];
    const findings: Finding[] = [
      fact(
        `Most of the population is not in the favourable quadrant`,
        `${favourable.length} of ${data.points.length} above both lines`,
      ),
      fact(
        `Several carry high ${data.xLabel.toLowerCase()} without the ${data.yLabel.toLowerCase()} to match`,
        `${exposed.length} of ${data.points.length} in the exposed quadrant`,
      ),
    ];
    if (worst) {
      findings.push(
        fact(
          `${worst.label} the furthest into that quadrant`,
          `${data.xLabel} ${value(worst.x, data.unit)}, ${data.yLabel} ${value(worst.y, data.unit)}`,
        ),
      );
    }
    return {
      headline: [`${exposed.length} of ${data.points.length} sit in the exposed quadrant`],
      verdict: exposed.length > favourable.length ? 'watch' : 'neutral',
      findings: findings.slice(0, 3),
      subject: worst?.label ?? 'The exposed group',
    };
  }

  const best = [...data.points].sort((a, b) => b.y - a.y)[0];
  const worst = [...data.points].sort((a, b) => a.y - b.y)[0];
  if (!best || !worst) return undefined;
  return {
    headline: [`${best.label} leads on ${data.yLabel.toLowerCase()}`],
    verdict: 'neutral',
    findings: [
      fact(
        `${best.label} strongest on ${data.yLabel.toLowerCase()}`,
        `${value(best.y, data.unit)} against ${value(worst.y, data.unit)} at the bottom`,
      ),
      fact(
        `The spread across the population is wide enough to act on`,
        `${data.points.length} plotted, ${value(best.y - worst.y, data.unit)} between best and worst`,
      ),
    ],
    subject: best.label,
  };
}

function distributionReading(data: DistributionData): Reading | undefined {
  if (data.groups.length > 0) {
    const ranked = [...data.groups].sort((a, b) => b.q3 - b.q1 - (a.q3 - a.q1));
    const widest = ranked[0];
    const tightest = ranked.at(-1);
    if (!widest) return undefined;
    const findings: Finding[] = [
      fact(
        `${widest.label} the most dispersed group on the panel`,
        `middle half ${value(widest.q1, data.unit)}–${value(widest.q3, data.unit)}, median ${value(widest.median, data.unit)}`,
      ),
    ];
    if (tightest && tightest !== widest) {
      findings.push(
        fact(
          `${tightest.label} the most consistent`,
          `middle half ${value(tightest.q1, data.unit)}–${value(tightest.q3, data.unit)}`,
        ),
      );
    }
    return {
      headline: [`${widest.label} is the most dispersed group`],
      verdict: 'neutral',
      findings,
      subject: widest.label,
    };
  }

  if (data.bins.length === 0) return undefined;
  const total = data.bins.reduce((sum, b) => sum + (b.counts[0] ?? 0), 0);
  const peak = [...data.bins].sort((a, b) => (b.counts[0] ?? 0) - (a.counts[0] ?? 0))[0];
  if (!peak || total === 0) return undefined;
  const tail = data.bins.filter((b) => b.from > peak.to).reduce((sum, b) => sum + (b.counts[0] ?? 0), 0);

  return {
    headline: [`Most of the population sits in one band`],
    verdict: 'neutral',
    findings: [
      fact(
        `The population is concentrated in a single band`,
        `${value(peak.from, data.unit)}–${value(peak.to, data.unit)} holds ${formatPercent(share(peak.counts[0] ?? 0, total))}`,
      ),
      fact(
        tail > 0 ? 'There is a tail above that band worth looking at' : 'There is almost nothing above that band',
        `${formatPercent(share(tail, total))} of the population above ${value(peak.to, data.unit)}`,
      ),
    ],
    subject: data.valueLabel ?? data.seriesLabels[0] ?? 'The distribution',
  };
}

function geoReading(data: GeoData): Reading | undefined {
  if (data.points.length === 0) return undefined;
  const ranked = [...data.points].sort((a, b) => b.value - a.value);
  const total = ranked.reduce((sum, p) => sum + p.value, 0);
  const top = ranked[0];
  const bottom = ranked.at(-1);
  if (!top || !bottom) return undefined;
  const topTwo = ranked.slice(0, 2);

  return {
    headline: [`${top.label} carries more than any other branch`],
    verdict: share(topTwo.reduce((s, p) => s + p.value, 0), total) >= 50 ? 'watch' : 'neutral',
    findings: [
      fact(
        `${top.label} the largest branch on this measure`,
        `${value(top.value, data.unit)}, ${formatPercent(share(top.value, total))} of the network`,
      ),
      fact(
        `${topTwo.map((p) => p.label).join(' and ')} carry it between them`,
        `${formatPercent(share(topTwo.reduce((s, p) => s + p.value, 0), total))} across ${data.points.length} branches`,
      ),
      fact(
        `${bottom.label} the smallest, and may not cover its own cost`,
        `${value(bottom.value, data.unit)}, ${formatPercent(share(bottom.value, total))} of the network`,
      ),
    ],
    subject: top.label,
  };
}

function tableReading(data: TableData): Reading | undefined {
  const flagged = data.flagged?.length ?? 0;
  const findings: Finding[] = [
    fact(
      flagged === 0 ? 'Every row on this exception report is inside limit' : 'Rows on this exception report are outside limit',
      `${flagged} of ${data.rows.length} rows flagged`,
    ),
  ];
  if (data.rows.length > 0) {
    findings.push(
      fact(
        flagged > 0 ? 'The list is short enough to clear individually' : 'Nothing here needs clearing this week',
        `${data.rows.length} row${data.rows.length === 1 ? '' : 's'} on the report`,
      ),
    );
  }
  return {
    headline:
      flagged === 0
        ? ['Every row inside limit']
        : [`${flagged} of ${data.rows.length} rows outside limit`],
    verdict: flagged === 0 ? 'positive' : flagged > data.rows.length / 2 ? 'negative' : 'watch',
    findings,
    subject: 'The exception report',
    watchNext: 'Any flagged row still open at the next review.',
  };
}

function scenarioReading(data: ScenarioData): Reading | undefined {
  if (data.scenarios.length === 0) return undefined;

  if (data.mode === 'tornado') {
    const ranked = [...data.scenarios].sort(
      (a, b) => (b.high ?? 0) - (b.low ?? 0) - ((a.high ?? 0) - (a.low ?? 0)),
    );
    const widest = ranked[0];
    const narrowest = ranked.at(-1);
    if (!widest) return undefined;
    const swing = (widest.high ?? 0) - (widest.low ?? 0);
    return {
      headline: [`${widest.label} is the widest exposure in the book`],
      verdict: 'watch',
      findings: [
        fact(
          `${widest.label} swings the result further than any other driver`,
          `${value(swing, data.unit)} around a ${value(data.baseline, data.unit)} base`,
        ),
        ...(narrowest && narrowest !== widest
          ? [
              fact(
                `${narrowest.label} barely moves it`,
                `${value((narrowest.high ?? 0) - (narrowest.low ?? 0), data.unit)} of swing`,
              ),
            ]
          : []),
      ],
      subject: widest.label,
      watchNext: `${widest.label} moving beyond the range modelled here.`,
    };
  }

  const worst = [...data.scenarios].sort((a, b) => a.value - b.value)[0];
  const best = [...data.scenarios].sort((a, b) => b.value - a.value)[0];
  if (!worst || !best) return undefined;
  return {
    headline: [`The ${worst.label.toLowerCase()} case costs ${value(Math.abs(worst.delta), data.unit)}`],
    verdict: 'watch',
    findings: [
      fact(
        `The ${worst.label.toLowerCase()} case is the one to plan against`,
        `${value(worst.value, data.unit)} against a ${value(data.baseline, data.unit)} base`,
      ),
      fact(
        `The spread between best and worst is wide enough to matter`,
        `${value(best.value - worst.value, data.unit)} across ${data.scenarios.length} scenarios`,
      ),
    ],
    subject: worst.label,
    watchNext: `Conditions moving towards the ${worst.label.toLowerCase()} case.`,
  };
}

/** One visitor per shape, exhaustive over the union — the same 15 cases `finding.ts` walks. */
function readingFor(data: ChartData, downIsGood: boolean): Reading | undefined {
  switch (data.shape) {
    case 'timeSeries':
      return timeSeriesReading(data, downIsGood);
    case 'breakdown':
      return breakdownReading(data);
    case 'ranked':
      return rankedReading(data);
    case 'matrix':
      return matrixReading(data);
    case 'funnelSteps':
      return funnelReading(data);
    case 'distribution':
      return distributionReading(data);
    case 'flows':
      return flowsReading(data);
    case 'scatterPoints':
      return scatterReading(data);
    case 'gaugeSet':
      return gaugeReading(data);
    case 'bulletRows':
      return bulletReading(data, downIsGood);
    case 'tableRows':
      return tableReading(data);
    case 'waterfallSteps':
      return waterfallReading(data);
    case 'geoPoints':
      return geoReading(data);
    case 'kpiSet':
      return kpiReading(data);
    case 'scenarioSet':
      return scenarioReading(data);
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/**
 * The fallback reading, for a panel too thin to say anything about.
 *
 * It still carries a figure and an action, because a reading with neither is exactly the
 * platitude this feature exists to avoid. What it does not do is pretend to a verdict.
 */
function thinReading(insight: Insight, unit: Unit): Reading {
  return {
    headline: [`${insight.domain} needs a longer window to read`],
    verdict: 'neutral',
    findings: [
      fact(
        'This panel is drawing too few points to support a claim about direction',
        `${insight.vizLabel}, ${insight.refresh.toLowerCase()} refresh, unit ${unit}`,
      ),
    ],
    subject: insight.domain,
  };
}

/**
 * The reading for one insight, under one filter selection.
 *
 * `panels` is what the card drew — `panelsFor(id, filters)` — so the figures quoted here
 * are the figures on screen. Pure and synchronous: the delay that drives the progress bar
 * belongs to the provider, not to the arithmetic.
 */
export function generateInsight(
  insight: Insight,
  panels: readonly ChartData[],
  filters: Filters,
): GeneratedInsight {
  const primary = panels[0];
  /*
   * PRD §9: which way is good is a property of the metric, not of the sign. `isDownGood`
   * is the rule the KPI deltas and the gauges already read, so a reading cannot call a
   * rising NPL ratio good on a card whose own tiles are colouring it red.
   */
  const downIsGood = isDownGood(insight);
  const reading =
    (primary ? readingFor(primary, downIsGood) : undefined) ?? thinReading(insight, insight.unit);
  const theme = themeFor(insight.layer, insight.group);
  const adverse = reading.verdict === 'negative' || reading.verdict === 'watch';

  /*
   * A sidecar earns a line only when it is saying something the primary did not. The KPI
   * tiles beside a line chart are usually the same story twice, and a reading that repeats
   * itself is what makes a reader stop trusting it.
   */
  const sidecar = panels[1] ? readingFor(panels[1], downIsGood) : undefined;
  const extra =
    sidecar?.findings.filter(
      (f) => !reading.findings.some((existing) => existing.text === f.text),
    ) ?? [];

  const findings = [...reading.findings, ...extra].slice(0, 3);

  const actions: Action[] = adverse
    ? theme.levers
        .slice(0, reading.verdict === 'negative' ? 2 : 1)
        .map((lever) => ({ text: lever.text, horizon: lever.horizon, owner: lever.owner }))
    : [{ text: theme.probe, horizon: 'now' as const, owner: theme.owner }];

  /*
   * Thin data and a window caveat both mean the same thing: the reading is true of what was
   * drawn and the reader should know what that was. `note` is the span caveat `seriesFor`
   * attaches when a period cannot be honoured — see plan §2.26.
   */
  const note = primary?.note;
  const confidence: Confidence =
    findings.length < 2 && note ? 'low' : findings.length < 2 || note ? 'medium' : 'high';

  const caveat =
    confidence === 'high'
      ? undefined
      : (note ?? 'Only one claim is supportable from the data on this panel.');

  /*
   * A theme's watch line takes the subject as its first word, and a subject is a label —
   * it can be lower case. The sentence starts here, so it is capitalised here.
   */
  const watchNext = reading.watchNext ?? sentence(theme.watch(reading.subject));

  return {
    headline: headlineOf(reading.headline),
    verdict: reading.verdict,
    findings,
    soWhat: theme.consequence[adverse ? 'adverse' : 'steady'](reading.subject),
    actions: actions.slice(0, 3),
    watchNext,
    confidence,
    ...(caveat ? { caveat } : {}),
    scope: describeFilters(filters),
  };
}

/** Exported for the gate, which checks the caps the types promise. */
export const caps = { words, HEADLINE_MAX_WORDS, FINDING_MAX_WORDS };
