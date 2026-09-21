/**
 * What a section is *about*, so a reading can say what follows from it.
 *
 * The figures in a generated insight come from the rendered data and cannot be invented.
 * The consequence and the action cannot come from the data at all: nothing in a series
 * knows that a cost-to-income miss is Finance's to fix and a liquidity one is Treasury's.
 * That knowledge is written down here, once, keyed on the section — which is the level
 * the bank itself organises by.
 *
 * Every one of the 30 `(layer, group)` pairs is mapped explicitly rather than matched on
 * keywords. A keyword rule would put "Corporate Deposits" and "Deposits & Liabilities"
 * on the same lever, which is wrong: one is a relationship desk and the other is a branch
 * network. `verify:insights` fails if a section is missing, so a catalogue refresh that
 * adds one cannot quietly fall back to a platitude.
 */

import type { Layer } from '../types.ts';

export type ThemeKey =
  | 'balanceSheet'
  | 'profitability'
  | 'cost'
  | 'liquidity'
  | 'capital'
  | 'creditRisk'
  | 'deposits'
  | 'lending'
  | 'customers'
  | 'payments'
  | 'channels'
  | 'operations'
  | 'compliance'
  | 'tradeFinance'
  | 'planning';

/** How urgently an action wants doing. Three values, because a fourth is never read. */
export type Horizon = 'now' | 'this month' | 'this quarter';

export interface Lever {
  readonly text: string;
  readonly horizon: Horizon;
  readonly owner: string;
}

export interface Theme {
  readonly owner: string;
  /**
   * The business consequence, in one sentence.
   *
   * Two tones rather than four: a reading that is drifting and one that is breaching want
   * the same sentence at different volumes, and writing four per theme produced copy that
   * differed only in adverbs.
   */
  readonly consequence: Readonly<Record<'adverse' | 'steady', (subject: string) => string>>;
  /** Levers, most urgent first. A reading takes one or two, never all of them. */
  readonly levers: readonly Lever[];
  /** Where the panel shows nothing to pull, this is the investigation to run instead. */
  readonly probe: string;
  /** The line under "Watch", phrased for this theme. */
  readonly watch: (subject: string) => string;
}

const THEMES: Readonly<Record<ThemeKey, Theme>> = {
  balanceSheet: {
    owner: 'Finance',
    consequence: {
      adverse: (s) => `The shape of the balance sheet is moving faster than the plan assumed, and ${s} is where.`,
      steady: (s) => `The balance sheet is holding the shape this year's plan was built on, ${s} included.`,
    },
    levers: [
      { text: 'Rebase the balance-sheet plan to the current run rate', horizon: 'this quarter', owner: 'Finance' },
      { text: 'Reconcile the movement to the GL before the next ALCO', horizon: 'this month', owner: 'Finance' },
    ],
    probe: 'Pull the month-on-month movement by reporting line',
    watch: (s) => `${s} moving more than 5% in a single month.`,
  },
  profitability: {
    owner: 'Finance',
    consequence: {
      adverse: (s) => `This is what puts the return target at risk, and ${s} is carrying the miss, not volume.`,
      steady: (s) => `The return target is being carried by margin rather than by volume, ${s} included.`,
    },
    levers: [
      { text: 'Reprice the lowest-margin book before the next cycle', horizon: 'this month', owner: 'Treasury' },
      { text: 'Take the margin bridge to the next ALCO with the plan variance attached', horizon: 'this quarter', owner: 'Finance' },
    ],
    probe: 'Pull the margin bridge by product and by division',
    watch: (s) => `${s} missing plan for a second consecutive month.`,
  },
  cost: {
    owner: 'Finance',
    consequence: {
      adverse: (s) => `Efficiency is the line the board reads first, and ${s} is moving it the wrong way.`,
      steady: (s) => `Efficiency is holding, ${s} included, which keeps the cost story off the board's agenda.`,
    },
    levers: [
      { text: 'Freeze discretionary spend on the lines above budget', horizon: 'now', owner: 'Finance' },
      { text: 'Rebase the cost allocation across the branch network', horizon: 'this quarter', owner: 'Operations' },
    ],
    probe: 'Pull the opex breakdown by cost centre',
    watch: (s) => `${s} failing to improve over two consecutive months.`,
  },
  liquidity: {
    owner: 'Treasury',
    consequence: {
      adverse: (s) => `A regulator asks about the buffer first, and ${s} is the part of the answer that is moving.`,
      steady: (s) => `There is room to absorb an outflow without touching the contingency plan, ${s} included.`,
    },
    levers: [
      { text: 'Re-run the outflow assumptions against the current buffer', horizon: 'now', owner: 'Treasury' },
      { text: 'Lengthen the funding profile on the shortest tenors', horizon: 'this month', owner: 'Treasury' },
    ],
    probe: 'Pull the outflow profile by counterparty and tenor',
    watch: (s) => `${s} moving within 5pp of its regulatory floor.`,
  },
  capital: {
    owner: 'Finance',
    consequence: {
      adverse: (s) => `Capital constrains what can be lent next quarter before anything else does, and ${s} sets it.`,
      steady: (s) => `There is headroom for the lending the plan assumes next quarter, with ${s} where it stands.`,
    },
    levers: [
      { text: 'Re-run the RWA forecast against the lending pipeline', horizon: 'this month', owner: 'Finance' },
      { text: 'Take the headroom to ALCO with the growth plan beside it', horizon: 'this quarter', owner: 'Finance' },
    ],
    probe: 'Pull the RWA movement by exposure class',
    watch: (s) => `${s} falling within 1pp of the regulatory minimum.`,
  },
  creditRisk: {
    owner: 'Credit Risk',
    consequence: {
      adverse: (s) => `The next impairment charge comes from here if nothing changes, and ${s} is where it starts.`,
      steady: (s) => `The next impairment charge is not currently coming from here, ${s} included.`,
    },
    levers: [
      { text: 'Review the worst-performing segment against current appetite', horizon: 'now', owner: 'Credit Risk' },
      { text: 'Tighten origination criteria where the deterioration is concentrated', horizon: 'this month', owner: 'Credit Risk' },
    ],
    probe: 'Pull the flow into arrears by vintage and by segment',
    watch: (s) => `${s} deteriorating for a third consecutive month.`,
  },
  deposits: {
    owner: 'Retail Distribution',
    consequence: {
      adverse: (s) => `This is a funding question before it is a sales one, and ${s} is where the funding sits.`,
      steady: (s) => `The funding base is broad enough to price lending competitively, ${s} included.`,
    },
    levers: [
      { text: 'Reprice term deposits in the segments losing balance', horizon: 'this month', owner: 'Treasury' },
      { text: 'Set a retention contact plan for the largest depositors', horizon: 'this quarter', owner: 'Retail Distribution' },
    ],
    probe: 'Pull the balance movement by product and by depositor size band',
    watch: (s) => `${s} concentrating further in the top 1% of depositors.`,
  },
  lending: {
    owner: 'Credit Risk',
    consequence: {
      adverse: (s) => `The book sets both interest income and impairment next year, and ${s} is what is moving it.`,
      steady: (s) => `The book is growing without the risk profile moving with it, ${s} included.`,
    },
    levers: [
      { text: 'Re-test pricing against the risk cost the book is actually carrying', horizon: 'this month', owner: 'Credit Risk' },
      { text: 'Rebalance the origination mix towards the better-performing segments', horizon: 'this quarter', owner: 'Credit Risk' },
    ],
    probe: 'Pull origination volume and risk grade by segment',
    watch: (s) => `${s} growing faster than the deposit base funding it.`,
  },
  customers: {
    owner: 'Retail Distribution',
    consequence: {
      adverse: (s) => `The franchise takes years to rebuild once this turns, and ${s} is where it is turning.`,
      steady: (s) => `The franchise is growing without being bought back through pricing, ${s} included.`,
    },
    levers: [
      { text: 'Review onboarding drop-off at the steepest stage', horizon: 'this month', owner: 'Retail Distribution' },
      { text: 'Set a reactivation plan for the dormant base', horizon: 'this quarter', owner: 'Retail Distribution' },
    ],
    probe: 'Pull acquisition and attrition by channel and by segment',
    watch: (s) => `${s} falling for two consecutive months.`,
  },
  payments: {
    owner: 'Payments',
    consequence: {
      adverse: (s) => `Fee income and customer habit move together here, and ${s} is where both are at stake.`,
      steady: (s) => `Fee income is growing off transaction habit rather than off price, ${s} included.`,
    },
    levers: [
      { text: 'Investigate the drop at the weakest transaction stage', horizon: 'now', owner: 'Payments' },
      { text: 'Review interchange and fee settings on the declining products', horizon: 'this quarter', owner: 'Payments' },
    ],
    probe: 'Pull transaction volume and value by channel',
    watch: (s) => `${s} declining while active customers hold flat.`,
  },
  channels: {
    owner: 'Digital',
    consequence: {
      adverse: (s) => `Cost to serve follows the channel mix, and ${s} is what is holding volume in the expensive one.`,
      steady: (s) => `Volume is moving to the cheaper channel, ${s} included, which is where cost to serve falls.`,
    },
    levers: [
      { text: 'Push the highest-volume branch journey into the app', horizon: 'this quarter', owner: 'Digital' },
      { text: 'Review adoption in the branches furthest behind', horizon: 'this month', owner: 'Digital' },
    ],
    probe: 'Pull channel mix by transaction type and by branch',
    watch: (s) => `${s} stalling below the digital adoption plan.`,
  },
  operations: {
    owner: 'Operations',
    consequence: {
      adverse: (s) => `This shows up as cost to serve long before it shows up in a complaint, and ${s} is the queue.`,
      steady: (s) => `Service is holding at the cost the plan assumed, ${s} included.`,
    },
    levers: [
      { text: 'Rebalance capacity towards the worst-performing process', horizon: 'this month', owner: 'Operations' },
      { text: 'Set a service-level target for the slowest queue', horizon: 'this quarter', owner: 'Operations' },
    ],
    probe: 'Pull throughput and turnaround by process',
    watch: (s) => `${s} slipping further behind its service level.`,
  },
  compliance: {
    owner: 'Compliance',
    consequence: {
      adverse: (s) => `This is cheap to fix now and expensive to explain later, and ${s} is the open item.`,
      steady: (s) => `Everything here is inside limit, ${s} included, which is what keeps it off the regulator's agenda.`,
    },
    levers: [
      { text: 'Clear the open items outside limit', horizon: 'now', owner: 'Compliance' },
      { text: 'Review the alert threshold that is producing the backlog', horizon: 'this month', owner: 'Compliance' },
    ],
    probe: 'Pull open cases by age and by type',
    watch: (s) => `${s} carrying any item beyond its due date.`,
  },
  tradeFinance: {
    owner: 'Corporate Coverage',
    consequence: {
      adverse: (s) => `Contingent exposure becomes real exposure when a client cannot pay, and ${s} is the largest.`,
      steady: (s) => `Fee income is coming from exposure the bank is being paid to carry, ${s} included.`,
    },
    levers: [
      { text: 'Review the largest contingent exposures against client limits', horizon: 'this month', owner: 'Corporate Coverage' },
      { text: 'Re-test pricing on the instruments with the longest tenor', horizon: 'this quarter', owner: 'Corporate Coverage' },
    ],
    probe: 'Pull outstanding instruments by client and by tenor',
    watch: (s) => `${s} rising while client limits stay unchanged.`,
  },
  planning: {
    owner: 'Finance',
    consequence: {
      adverse: (s) => `This is the gap between what the board was promised and what the run rate delivers, and ${s} is it.`,
      steady: (s) => `The year-end position is inside what the board was promised, ${s} included.`,
    },
    levers: [
      { text: 'Reforecast the year-end position on the current run rate', horizon: 'this month', owner: 'Finance' },
      { text: 'Take the variance to the board with the recovery plan attached', horizon: 'this quarter', owner: 'Finance' },
    ],
    probe: 'Pull actuals against budget by line',
    watch: (s) => `${s} widening against plan for a second month.`,
  },
};

/** All 30 sections, keyed `layer|group`. `group` is the workbook spelling — see plan §2.5. */
const THEME_BY_SECTION: Readonly<Record<string, ThemeKey>> = {
  'executive|Balance Sheet': 'balanceSheet',
  'executive|Profitability Ratios': 'profitability',
  'executive|Liquidity': 'liquidity',
  'executive|Capital': 'capital',
  'executive|Business Mix': 'balanceSheet',
  'executive|Credit Quality': 'creditRisk',
  'executive|Planning': 'planning',
  'bank-wide|Financial Performance': 'profitability',
  'bank-wide|Balance Sheet Structure': 'balanceSheet',
  'bank-wide|Treasury, Alm & Market Risk': 'liquidity',
  'bank-wide|Liquidity & Funding': 'liquidity',
  'bank-wide|Capital': 'capital',
  'bank-wide|Bank-Wide Credit Risk': 'creditRisk',
  'bank-wide|Operations & Efficiency': 'operations',
  'bank-wide|Franchise & Customers': 'customers',
  'bank-wide|Compliance & Financial Crime': 'compliance',
  'retail|Customer Growth & Base': 'customers',
  'retail|Deposits & Liabilities': 'deposits',
  'retail|Retail Lending': 'lending',
  'retail|Payments, Cards & Transactions': 'payments',
  'retail|Channels & Digital': 'channels',
  'retail|Retail Risk & Collections': 'creditRisk',
  'retail|Retail Profitability': 'profitability',
  'corporate|Client Base & Relationships': 'customers',
  'corporate|Corporate Lending': 'lending',
  'corporate|Corporate Deposits': 'deposits',
  'corporate|Trade Finance & Guarantees': 'tradeFinance',
  'corporate|Cash Management & Payments': 'payments',
  'corporate|Corporate Risk': 'creditRisk',
  'corporate|Corporate Profitability': 'profitability',
};

export function sectionKey(layer: Layer, group: string): string {
  return `${layer}|${group}`;
}

/**
 * The theme for a section.
 *
 * Falls back to `balanceSheet` so an unmapped section still produces a well-formed
 * reading rather than throwing mid-demo — but the gate fails on the missing key, which
 * is where an unmapped section is supposed to be noticed.
 */
export function themeFor(layer: Layer, group: string): Theme {
  return THEMES[THEME_BY_SECTION[sectionKey(layer, group)] ?? 'balanceSheet'];
}

/** A cost-to-income or expense section reads as cost even where it is filed under profit. */
export function themeKeyFor(layer: Layer, group: string): ThemeKey | undefined {
  return THEME_BY_SECTION[sectionKey(layer, group)];
}

export { THEMES, THEME_BY_SECTION };
