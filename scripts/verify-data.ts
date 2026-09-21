/**
 * Phase 1 exit gate.
 *
 * Asserts the data layer against the plan's verified facts (§1) and PRD §7.1.
 * Importing `bank.ts` and `entities.ts` already runs their load-time assertions
 * (A3); this script adds the catalogue-shape checks and prints a report.
 *
 *   npm run verify:data
 */

import { LAYERS, VARIANTS_BY_COMPONENT, type ChartComponent, type Layer } from '../src/types.ts';
import {
  allPanels,
  byId,
  byLayer,
  bySection,
  insights,
  prevNextInSection,
  sectionsFor,
  slugify,
  totals,
} from '../src/data/insights.ts';
import { ASOF, bank, reconcileRatios } from '../src/data/bank.ts';
import {
  branches,
  currencies,
  depositProducts,
  loanProducts,
  sectors,
  segments,
} from '../src/data/entities.ts';
import {
  axisDates,
  axisFor,
  concentrationCurve,
  concentrationWeights,
  seeded,
} from '../src/data/generators.ts';

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

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

// ---------------------------------------------------------------------------

heading('Catalogue totals (plan 1.2, 1.4)');
check('163 insights', totals.insights === 163, `got ${totals.insights}`);
check('236 panels', totals.panels === 236, `got ${totals.panels}`);
check('30 sections', totals.sections === 30, `got ${totals.sections}`);
check('73 two-panel insights', totals.twoPanel === 73, `got ${totals.twoPanel}`);
check('36 demo-path insights', totals.demoPath === 36, `got ${totals.demoPath}`);
check('no duplicate ids', new Set(insights.map((i) => i.id)).size === insights.length);

// ---------------------------------------------------------------------------

heading('Pages and sections (plan 1.2)');

/** Expected section membership, transcribed from plan 1.2. This is the drift gate. */
const EXPECTED: Readonly<Record<Layer, readonly [string, number][]>> = {
  executive: [
    ['balance-sheet', 1],
    ['profitability-ratios', 2],
    ['liquidity', 1],
    ['capital', 1],
    ['business-mix', 1],
    ['credit-quality', 1],
    ['planning', 1],
  ],
  'bank-wide': [
    ['financial-performance', 8],
    ['balance-sheet-structure', 5],
    ['treasury-alm-market-risk', 7],
    ['liquidity-funding', 6],
    ['capital', 4],
    ['bank-wide-credit-risk', 7],
    ['operations-efficiency', 6],
    ['franchise-customers', 5],
    ['compliance-financial-crime', 4],
  ],
  retail: [
    ['customer-growth-base', 10],
    ['deposits-liabilities', 10],
    ['retail-lending', 10],
    ['payments-cards-transactions', 6],
    ['channels-digital', 6],
    ['retail-risk-collections', 7],
    ['retail-profitability', 5],
  ],
  corporate: [
    ['client-base-relationships', 8],
    ['corporate-lending', 10],
    ['corporate-deposits', 6],
    ['trade-finance-guarantees', 7],
    ['cash-management-payments', 5],
    ['corporate-risk', 8],
    ['corporate-profitability', 5],
  ],
};

const EXPECTED_LAYER_COUNTS: Readonly<Record<Layer, number>> = {
  executive: 8,
  'bank-wide': 52,
  retail: 54,
  corporate: 49,
};

for (const layer of LAYERS) {
  const actual = sectionsFor(layer);
  const expected = EXPECTED[layer];
  check(
    `${layer}: ${expected.length} sections in workbook order`,
    actual.length === expected.length &&
      actual.every((section, index) => section.slug === expected[index]?.[0]),
    `got [${actual.map((s) => s.slug).join(', ')}]`,
  );
  check(
    `${layer}: section counts`,
    actual.every((section, index) => section.count === expected[index]?.[1]),
    actual.map((s) => `${s.slug}=${s.count}`).join(' '),
  );
  check(
    `${layer}: ${EXPECTED_LAYER_COUNTS[layer]} insights`,
    byLayer(layer).length === EXPECTED_LAYER_COUNTS[layer],
    `got ${byLayer(layer).length}`,
  );
  check(
    `${layer}: section membership sums to the layer total`,
    actual.reduce((total, section) => total + bySection(layer, section.slug).length, 0) ===
      byLayer(layer).length,
  );
}

check(
  'slugs are unique within each layer',
  LAYERS.every((layer) => {
    const slugs = sectionsFor(layer).map((section) => section.slug);
    return new Set(slugs).size === slugs.length;
  }),
);
check(
  '"Capital" exists in two layers, so slugs must be layer-scoped (plan 2.6)',
  sectionsFor('executive').some((s) => s.slug === 'capital') &&
    sectionsFor('bank-wide').some((s) => s.slug === 'capital'),
);
check(
  'PRD 10 deep link /retail/deposits-liabilities resolves',
  bySection('retail', 'deposits-liabilities').length === 10,
);
check(
  'section labels use `domain`, so ALM is not rendered as Alm (plan 2.5)',
  sectionsFor('bank-wide').some((s) => s.label === 'Treasury, ALM & Market Risk'),
  sectionsFor('bank-wide')
    .map((s) => s.label)
    .join(' | '),
);
check(
  'every insight resolves to a section',
  insights.every((insight) => sectionsFor(insight.layer).some((s) => s.key === insight.group)),
);
check(
  'every group slugifies to something non-empty',
  insights.every((insight) => slugify(insight.group).length > 0),
);

// ---------------------------------------------------------------------------

heading('Components and variants (plan 1.3)');

const panels = allPanels();
const seenPairs = new Set(panels.map(({ panel }) => `${panel.component}:${panel.variant}`));
const declaredPairs = new Set(
  (Object.keys(VARIANTS_BY_COMPONENT) as ChartComponent[]).flatMap((component) =>
    VARIANTS_BY_COMPONENT[component].map((variant) => `${component}:${variant}`),
  ),
);

check('23 components declared', Object.keys(VARIANTS_BY_COMPONENT).length === 23);
check('39 (component, variant) pairs in the data', seenPairs.size === 39, `got ${seenPairs.size}`);
check(
  'every declared pair is used -- no dead variants',
  [...declaredPairs].every((pair) => seenPairs.has(pair)),
  [...declaredPairs].filter((pair) => !seenPairs.has(pair)).join(', '),
);
check(
  'every used pair is declared',
  [...seenPairs].every((pair) => declaredPairs.has(pair)),
  [...seenPairs].filter((pair) => !declaredPairs.has(pair)).join(', '),
);
check(
  'D2: TrafficLightPanel and FlowDiagram are absent (plan 3)',
  !('TrafficLightPanel' in VARIANTS_BY_COMPONENT) && !('FlowDiagram' in VARIANTS_BY_COMPONENT),
);
check(
  'KpiCards is panels[1] 23 times -- the sidecar layout of plan 2.7',
  insights.filter((i) => i.panels.length === 2 && i.panels[1]?.component === 'KpiCards').length === 23,
);

// ---------------------------------------------------------------------------

heading('Navigation (PRD 11.5)');

let prevNextOk = true;
let prevNextDetail = '';
for (const layer of LAYERS) {
  for (const section of sectionsFor(layer)) {
    const members = bySection(layer, section.slug);
    for (const [index, insight] of members.entries()) {
      const { prev, next } = prevNextInSection(insight.id);
      const expectPrev = index > 0 ? members[index - 1]?.id : undefined;
      const expectNext = index < members.length - 1 ? members[index + 1]?.id : undefined;
      if (prev?.id !== expectPrev || next?.id !== expectNext) {
        prevNextOk = false;
        prevNextDetail = `${insight.id} in ${layer}/${section.slug}`;
      }
    }
  }
}
check('prev/next is correct in all 30 sections and does not wrap', prevNextOk, prevNextDetail);
check(
  'single-insight sections return neither prev nor next',
  sectionsFor('executive')
    .filter((section) => section.count === 1)
    .every((section) => {
      const only = bySection('executive', section.slug)[0];
      if (!only) return false;
      const { prev, next } = prevNextInSection(only.id);
      return prev === undefined && next === undefined;
    }),
);
check(
  'byId throws on an unknown id',
  (() => {
    try {
      byId('X-99');
      return false;
    } catch {
      return true;
    }
  })(),
);

// ---------------------------------------------------------------------------

heading('Bank fixture (PRD 7.1)');

const bs = bank.balanceSheet;
check(
  'asset lines sum to totalAssets',
  bs.cashAndCentralBank +
    bs.investmentSecurities +
    bs.interbankPlacements +
    bs.grossLoans +
    bs.loanLossProvisions +
    bs.otherAssets ===
    bs.totalAssets,
);
check(
  'liabilities + equity = totalAssets',
  bs.customerDeposits + bs.interbankBorrowing + bs.otherLiabilities + bs.equity === bs.totalAssets,
);
check(
  'provision split reconciles',
  bs.specificProvisions + bs.generalProvisions === -bs.loanLossProvisions,
);
check('net profit is positive', bank.income.netProfit > 0);
check(
  'effective tax rate is 30.0%',
  Math.abs(bank.income.effectiveTaxRate - 0.3) < 1e-9,
  `${(bank.income.effectiveTaxRate * 100).toFixed(2)}%`,
);

console.log('\n  Ratio reconciliation vs PRD 7.1:');
for (const row of reconcileRatios()) {
  const mark = row.withinTolerance ? 'ok    ' : 'BREACH';
  const note = Math.abs(row.delta) > 0.06 ? '   <- accepted deviation, see bank.ts header' : '';
  console.log(
    `    ${mark}  ${row.ratio.padEnd(12)} derived ${row.derived.toFixed(3).padStart(8)}` +
      `   published ${row.published.toFixed(2).padStart(7)}` +
      `   delta ${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(3).padStart(6)}pp${note}`,
  );
  if (!row.withinTolerance) failures += 1;
}

// ---------------------------------------------------------------------------

heading('Entity reconciliation (PRD 7.1)');

check('deposits by product', sum(depositProducts.map((p) => p.balance)) === bs.customerDeposits);
check('deposits by branch', sum(branches.map((b) => b.deposits)) === bs.customerDeposits);
check('deposits by segment', sum(segments.map((s) => s.deposits)) === bs.customerDeposits);
check('deposits by currency', sum(currencies.map((c) => c.deposits)) === bs.customerDeposits);
check('loans by product', sum(loanProducts.map((p) => p.balance)) === bs.grossLoans);
check('loans by branch', sum(branches.map((b) => b.loans)) === bs.grossLoans);
check('loans by sector', sum(sectors.map((s) => s.loans)) === bs.grossLoans);
check('NPL by sector', sum(sectors.map((s) => s.nplStock)) === bs.nplStock);
check(
  '11 branches, 11 sectors, 6 segments, 4 currencies',
  branches.length === 11 && sectors.length === 11 && segments.length === 6 && currencies.length === 4,
);
check(
  'LDR shown anywhere = grossLoans / customerDeposits',
  Math.abs(bank.ratios.ldr - (bs.grossLoans / bs.customerDeposits) * 100) < 1e-9,
);

const topTwoShare =
  (sum(
    branches.filter((b) => b.id === 'baghdad-main' || b.id === 'erbil-main').map((b) => b.deposits),
  ) /
    bs.customerDeposits) *
  100;
check(
  'Baghdad Main + Erbil Main hold ~38% of deposits',
  Math.abs(topTwoShare - 38) < 0.5,
  `${topTwoShare.toFixed(2)}%`,
);

const construction = sectors.find((s) => s.id === 'construction');
check(
  'Construction is the worst sector NPL book',
  construction !== undefined &&
    sectors.every((s) => s.id === 'construction' || s.nplRate < construction.nplRate),
  construction ? `${construction.nplRate.toFixed(2)}%` : 'missing',
);

// ---------------------------------------------------------------------------

heading('Generators');

const rngA = seeded('R-17:0:default');
const rngB = seeded('R-17:0:default');
const rngC = seeded('R-17:1:default');
const drawsA = [rngA(), rngA(), rngA()];
const drawsB = [rngB(), rngB(), rngB()];
const drawsC = [rngC(), rngC(), rngC()];
check('same seed gives the same sequence (A4)', drawsA.every((value, i) => value === drawsB[i]));
check('panel index changes the sequence (A4)', drawsA.some((value, i) => value !== drawsC[i]));
check('draws are in [0, 1)', drawsA.every((value) => value >= 0 && value < 1));

check(
  'D1: only `Daily` gets a daily axis',
  axisFor('Daily').points === 90 &&
    axisFor('Daily / Monthly').points === 36 &&
    axisFor('Monthly').points === 36 &&
    axisFor('Monthly / Quarterly').points === 36,
);
const dailyCount = insights.filter((i) => axisFor(i.refresh).granularity === 'daily').length;
check('D1: 6 insights on a daily axis, 157 monthly', dailyCount === 6, `got ${dailyCount}`);

const monthly = axisDates('Monthly', ASOF);
const daily = axisDates('Daily', ASOF);
check(
  'monthly axis is 36 month-ends ending at asOf',
  monthly.length === 36 && monthly.at(-1) === ASOF,
  `${monthly[0]} .. ${monthly.at(-1)}`,
);
check(
  'daily axis is 90 days ending at asOf',
  daily.length === 90 && daily.at(-1) === ASOF,
  `${daily[0]} .. ${daily.at(-1)}`,
);
check(
  'every monthly point is a month end',
  monthly.every((iso) => {
    const date = new Date(`${iso}T00:00:00Z`);
    return new Date(date.getTime() + 86_400_000).getUTCDate() === 1;
  }),
);

check(
  'concentration: top 1% hold 34% of deposits (PRD 7.3)',
  Math.abs(concentrationCurve(0.01) - 0.34) < 1e-9,
  `${(concentrationCurve(0.01) * 100).toFixed(2)}%`,
);
check(
  'concentration: top 5% hold 58%',
  Math.abs(concentrationCurve(0.05) - 0.58) < 1e-9,
  `${(concentrationCurve(0.05) * 100).toFixed(2)}%`,
);
check(
  'concentration curve is monotonic and reaches 1',
  concentrationCurve(1) === 1 &&
    Array.from({ length: 101 }, (_, i) => concentrationCurve(i / 100)).every(
      (value, i, all) => i === 0 || value >= (all[i - 1] ?? 0),
    ),
);
const weights = concentrationWeights(1000);
check(
  'concentration weights are positive, descending and sum to 1',
  Math.abs(sum(weights) - 1) < 1e-9 &&
    weights.every((w) => w > 0) &&
    weights.every((w, i) => i === 0 || w <= (weights[i - 1] ?? Infinity)),
);

// ---------------------------------------------------------------------------

heading('Summary');
console.log(
  `  ${totals.insights} insights | ${totals.panels} panels | ${totals.sections} sections | ${totals.demoPath} on the demo path`,
);
console.log(
  `  as of ${ASOF} | total assets ${(bs.totalAssets / 1e12).toFixed(2)}T IQD | deposits ${(bs.customerDeposits / 1e12).toFixed(2)}T IQD`,
);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.\n`);
  process.exit(1);
}
console.log('\nAll checks passed.\n');
