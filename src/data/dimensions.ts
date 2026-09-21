/**
 * Categorical vocabularies, and the rule that picks one for an insight.
 *
 * `entities.ts` holds the fixtures that must reconcile to `bank.ts`. This module
 * holds the *presentation* vocabularies a chart breaks down by — maturity buckets,
 * channels, delinquency stages, ratings and so on — plus `dimensionFor()`, which
 * infers the right one from an insight's title, group and method.
 *
 * Inference is what keeps 163 charts sensible without 163 bespoke cases (PRD §7.4).
 * Five of these dimensions carry real fixture values and so reconcile exactly;
 * the rest are apportioned from the insight's anchor level.
 */

import type { Insight } from '../types.ts';
import { bank } from './bank.ts';
import { branches, currencies, depositProducts, loanProducts, sectors, segments } from './entities.ts';

export interface DimensionMember {
  readonly key: string;
  readonly label: string;
  /** Relative weight. For fixture dimensions this is the real balance. */
  readonly weight: number;
}

export type DimensionId =
  | 'branch'
  | 'assetClass'
  | 'complaintReason'
  | 'plLine'
  | 'operationalLoss'
  | 'counterpartyType'
  | 'customerType'
  | 'sector'
  | 'segment'
  | 'currency'
  | 'depositProduct'
  | 'loanProduct'
  | 'division'
  | 'channel'
  | 'maturity'
  | 'rateBucket'
  | 'delinquency'
  | 'stage'
  | 'rating'
  | 'ageBand'
  | 'country'
  | 'transactionType'
  | 'collateral'
  | 'incomeType'
  | 'expenseType'
  | 'investmentClass'
  | 'riskType'
  | 'relationshipManager'
  | 'tradeProduct'
  | 'generic';

export interface Dimension {
  readonly id: DimensionId;
  readonly label: string;
  readonly members: readonly DimensionMember[];
  /**
   * True where `members[].weight` is a real balance from `entities.ts`, so a
   * breakdown built from it reconciles to the `bank` fixture.
   */
  readonly reconciles: boolean;
}

function fixture(
  id: DimensionId,
  label: string,
  members: readonly DimensionMember[],
): Dimension {
  return { id, label, members, reconciles: true };
}

function vocabulary(
  id: DimensionId,
  label: string,
  members: readonly (readonly [string, string, number])[],
): Dimension {
  return {
    id,
    label,
    members: members.map(([key, memberLabel, weight]) => ({ key, label: memberLabel, weight })),
    reconciles: false,
  };
}

// ---------------------------------------------------------------------------
// Fixture-backed dimensions — these reconcile
// ---------------------------------------------------------------------------

const BRANCH = fixture(
  'branch',
  'Branch',
  branches.map((branch) => ({ key: branch.id, label: branch.name, weight: branch.deposits })),
);

const BRANCH_LOANS = fixture(
  'branch',
  'Branch',
  branches.map((branch) => ({ key: branch.id, label: branch.name, weight: branch.loans })),
);

const SECTOR = fixture(
  'sector',
  'Sector',
  sectors.map((sector) => ({ key: sector.id, label: sector.name, weight: sector.loans })),
);

const SEGMENT = fixture(
  'segment',
  'Segment',
  segments.map((segment) => ({ key: segment.id, label: segment.name, weight: segment.deposits })),
);

const CURRENCY = fixture(
  'currency',
  'Currency',
  currencies.map((currency) => ({ key: currency.code, label: currency.code, weight: currency.deposits })),
);

/**
 * Asset classes, carrying real fixture balances, so a composition chart sums to
 * `totalAssets`. Loans are net of provisions, which is how a balance sheet presents
 * them — gross loans plus a negative contra-asset would not stack.
 */
const ASSET_CLASS = fixture('assetClass', 'Asset class', [
  { key: 'cash', label: 'Cash & central bank', weight: bank.balanceSheet.cashAndCentralBank },
  { key: 'securities', label: 'Investment securities', weight: bank.balanceSheet.investmentSecurities },
  { key: 'interbank', label: 'Interbank placements', weight: bank.balanceSheet.interbankPlacements },
  { key: 'loans', label: 'Net loans', weight: bank.aggregates.netLoans },
  { key: 'other', label: 'Other assets', weight: bank.balanceSheet.otherAssets },
]);

const DEPOSIT_PRODUCT = fixture(
  'depositProduct',
  'Product',
  depositProducts.map((product) => ({ key: product.id, label: product.name, weight: product.balance })),
);

const LOAN_PRODUCT = fixture(
  'loanProduct',
  'Product',
  loanProducts.map((product) => ({ key: product.id, label: product.name, weight: product.balance })),
);

// ---------------------------------------------------------------------------
// Presentation vocabularies
// ---------------------------------------------------------------------------

const DIVISION = vocabulary('division', 'Division', [
  ['retail', 'Retail', 46],
  ['corporate', 'Corporate', 41],
  ['treasury', 'Treasury', 13],
]);

const CHANNEL = vocabulary('channel', 'Channel', [
  ['mobile', 'Mobile app', 34],
  ['internet', 'Internet banking', 18],
  ['branch', 'Branch', 21],
  ['atm', 'ATM', 15],
  ['pos', 'POS', 8],
  ['callcentre', 'Call centre', 4],
]);

const MATURITY = vocabulary('maturity', 'Maturity bucket', [
  ['sight', 'Sight', 31],
  ['0-1m', '0–1M', 19],
  ['1-3m', '1–3M', 17],
  ['3-6m', '3–6M', 13],
  ['6-12m', '6–12M', 11],
  ['1-3y', '1–3Y', 6],
  ['3y+', '> 3Y', 3],
]);

const RATE_BUCKET = vocabulary('rateBucket', 'Rate bucket', [
  ['0', 'Non-bearing', 28],
  ['0-2', '0–2%', 24],
  ['2-4', '2–4%', 21],
  ['4-6', '4–6%', 16],
  ['6+', '> 6%', 11],
]);

const DELINQUENCY = vocabulary('delinquency', 'Delinquency bucket', [
  ['current', 'Current', 88],
  ['1-30', '1–30 DPD', 5.4],
  ['31-60', '31–60 DPD', 2.3],
  ['61-90', '61–90 DPD', 1.5],
  ['90+', '90+ DPD', 2.8],
]);

const STAGE = vocabulary('stage', 'IFRS 9 stage', [
  ['s1', 'Stage 1', 84],
  ['s2', 'Stage 2', 9.2],
  ['s3', 'Stage 3', 6.8],
]);

const RATING = vocabulary('rating', 'Risk rating', [
  ['r1', 'Grade 1', 7],
  ['r2', 'Grade 2', 14],
  ['r3', 'Grade 3', 23],
  ['r4', 'Grade 4', 24],
  ['r5', 'Grade 5', 17],
  ['r6', 'Grade 6', 9],
  ['r7', 'Grade 7', 6],
]);

const AGE_BAND = vocabulary('ageBand', 'Age band', [
  ['18-25', '18–25', 14],
  ['26-35', '26–35', 29],
  ['36-45', '36–45', 24],
  ['46-55', '46–55', 17],
  ['56-65', '56–65', 10],
  ['65+', '65+', 6],
]);

const COUNTRY = vocabulary('country', 'Corridor', [
  ['tr', 'Türkiye', 24],
  ['cn', 'China', 21],
  ['ae', 'UAE', 18],
  ['ir', 'Iran', 11],
  ['jo', 'Jordan', 8],
  ['in', 'India', 7],
  ['de', 'Germany', 6],
  ['eg', 'Egypt', 5],
]);

const TRANSACTION_TYPE = vocabulary('transactionType', 'Transaction type', [
  ['transfer', 'Transfers', 27],
  ['card', 'Card payments', 22],
  ['salary', 'Salary credits', 18],
  ['cash', 'Cash withdrawal', 15],
  ['bill', 'Bill payments', 11],
  ['remit', 'Remittances', 7],
]);

const COLLATERAL = vocabulary('collateral', 'Collateral type', [
  ['realestate', 'Real estate', 38],
  ['cash', 'Cash & deposits', 17],
  ['guarantee', 'Third-party guarantee', 14],
  ['inventory', 'Inventory & receivables', 12],
  ['vehicle', 'Vehicles & equipment', 9],
  ['unsecured', 'Unsecured', 10],
]);

const INCOME_TYPE = vocabulary('incomeType', 'Income type', [
  ['nii', 'Net interest income', 63.6],
  ['fees', 'Fees & commissions', 26.2],
  ['fx', 'FX & trading', 10.2],
]);

const EXPENSE_TYPE = vocabulary('expenseType', 'Expense type', [
  ['staff', 'Staff costs', 44],
  ['premises', 'Premises', 14],
  ['it', 'IT & data', 18],
  ['depreciation', 'Depreciation', 9],
  ['marketing', 'Marketing', 6],
  ['other', 'Other admin', 9],
]);

const INVESTMENT_CLASS = vocabulary('investmentClass', 'Classification', [
  ['tbills', 'Treasury bills', 41],
  ['cbi', 'CBI certificates', 26],
  ['govt', 'Government bonds', 21],
  ['equity', 'Equities', 7],
  ['other', 'Other securities', 5],
]);

const RISK_TYPE = vocabulary('riskType', 'Risk type', [
  ['credit', 'Credit risk', 78],
  ['operational', 'Operational risk', 15],
  ['market', 'Market risk', 7],
]);

const TRADE_PRODUCT = vocabulary('tradeProduct', 'Instrument', [
  ['lc-sight', 'LC at sight', 31],
  ['lc-usance', 'LC usance', 21],
  ['guarantee-perf', 'Performance guarantee', 24],
  ['guarantee-bid', 'Bid bond', 13],
  ['collection', 'Documentary collection', 11],
]);

const RELATIONSHIP_MANAGER = vocabulary('relationshipManager', 'Relationship manager', [
  ['rm-01', 'RM 01', 18],
  ['rm-02', 'RM 02', 16],
  ['rm-03', 'RM 03', 15],
  ['rm-04', 'RM 04', 13],
  ['rm-05', 'RM 05', 12],
  ['rm-06', 'RM 06', 10],
  ['rm-07', 'RM 07', 9],
  ['rm-08', 'RM 08', 7],
]);

/** P&L lines, for budget-variance and contribution charts. */
const PL_LINE = vocabulary('plLine', 'P&L line', [
  ['nii', 'Net interest income', 34],
  ['fees', 'Fees & commissions', 21],
  ['fx', 'FX & trading', 12],
  ['opex', 'Operating expenses', 18],
  ['impairment', 'Impairment', 9],
  ['tax', 'Tax', 6],
]);

const COMPLAINT_REASON = vocabulary('complaintReason', 'Complaint reason', [
  ['fees', 'Fees & charges', 27],
  ['service', 'Service delays', 23],
  ['cards', 'Card disputes', 18],
  ['digital', 'Digital channels', 14],
  ['branch', 'Branch experience', 11],
  ['terms', 'Product terms', 7],
]);

const OPERATIONAL_LOSS = vocabulary('operationalLoss', 'Loss category', [
  ['process', 'Process failure', 31],
  ['system', 'System outage', 24],
  ['external-fraud', 'External fraud', 19],
  ['people', 'People & training', 12],
  ['legal', 'Legal & regulatory', 9],
  ['internal-fraud', 'Internal fraud', 5],
]);

const COUNTERPARTY_TYPE = vocabulary('counterpartyType', 'Counterparty', [
  ['domestic-bank', 'Domestic banks', 34],
  ['cbi', 'Central Bank of Iraq', 28],
  ['regional-bank', 'Regional banks', 21],
  ['correspondent', 'Correspondent banks', 12],
  ['other', 'Other institutions', 5],
]);

const CUSTOMER_TYPE = vocabulary('customerType', 'Customer type', [
  ['retail', 'Retail customers', 72],
  ['corporate', 'Corporate clients', 16],
  ['sme', 'SME clients', 9],
  ['staff', 'Staff & related', 3],
]);

const GENERIC = vocabulary('generic', 'Category', [
  ['a', 'Category A', 28],
  ['b', 'Category B', 23],
  ['c', 'Category C', 18],
  ['d', 'Category D', 14],
  ['e', 'Category E', 10],
  ['f', 'Category F', 7],
]);

// ---------------------------------------------------------------------------
// Inference
// ---------------------------------------------------------------------------

/**
 * Ordered rules — the first match wins, so put the specific before the general.
 * Matched against title + group + vizLabel, lowercased.
 */
const RULES: readonly { test: RegExp; pick: (insight: Insight) => Dimension }[] = [
  { test: /cohort|retention|survival/, pick: () => AGE_BAND },
  { test: /maturity|tenor|duration|repricing gap|ladder|liquidity gap/, pick: () => MATURITY },
  { test: /rate[- ]sensitive|rate bucket|repricing/, pick: () => RATE_BUCKET },
  { test: /collateral|ltv|security coverage/, pick: () => COLLATERAL },
  { test: /roll[- ]rate|delinquen|dpd|bucket.*(arrear|past due)|ageing|aging/, pick: () => DELINQUENCY },
  { test: /ifrs ?9|stage|ecl/, pick: () => STAGE },
  { test: /rating|grade|migration|pd band|scorecard/, pick: () => RATING },
  { test: /corridor|country|cross[- ]border|import|export|geograph/, pick: () => COUNTRY },
  { test: /rwa|risk[- ]weighted/, pick: () => RISK_TYPE },
  { test: /asset composition|asset mix|deployment|balance sheet growth|asset deployment/, pick: () => ASSET_CLASS },
  { test: /budget vs actual|p&l variance|p&l contribution|profit bridge/, pick: () => PL_LINE },
  { test: /complaint|service quality/, pick: () => COMPLAINT_REASON },
  { test: /operational loss|incident|operational risk event/, pick: () => OPERATIONAL_LOSS },
  { test: /interbank|money market|correspondent/, pick: () => COUNTERPARTY_TYPE },
  { test: /customer base|total accounts|accounts opened|new accounts/, pick: () => CUSTOMER_TYPE },
  { test: /investment portfolio|securities|classification|htm|afs/, pick: () => INVESTMENT_CLASS },
  { test: /\blc\b|letter of credit|guarantee|trade finance/, pick: () => TRADE_PRODUCT },
  { test: /cost|expense|opex|efficiency ratio|staff/, pick: () => EXPENSE_TYPE },
  { test: /non[- ]interest income|fee|commission|income breakdown|revenue mix/, pick: () => INCOME_TYPE },
  { test: /relationship manager|\brm\b/, pick: () => RELATIONSHIP_MANAGER },
  { test: /channel|digital|mobile|atm|branch traffic|self[- ]service/, pick: () => CHANNEL },
  { test: /transaction|payment|spend|throughput|salary inflow/, pick: () => TRANSACTION_TYPE },
  { test: /currency|\bfx\b|foreign exchange|dollar/, pick: () => CURRENCY },
  { test: /sector|industry/, pick: () => SECTOR },
  { test: /age|gender|demograph/, pick: () => AGE_BAND },
  { test: /segment|tier|mass|affluent|private|sme|mid[- ]cap|large corporate/, pick: () => SEGMENT },
  { test: /division|retail vs corporate|business mix|synergy/, pick: () => DIVISION },
  { test: /branch|network|region|city/, pick: (insight) => (isLending(insight) ? BRANCH_LOANS : BRANCH) },
  { test: /product/, pick: (insight) => (isLending(insight) ? LOAN_PRODUCT : DEPOSIT_PRODUCT) },
];

function isLending(insight: Insight): boolean {
  return /loan|lend|credit|advance|facility|mortgage|npl|overdraft|disburse|exposure/.test(
    `${insight.title} ${insight.group}`.toLowerCase(),
  );
}

function isDeposits(insight: Insight): boolean {
  return /deposit|funding|casa|liabilit|current account|savings|term/.test(
    `${insight.title} ${insight.group}`.toLowerCase(),
  );
}

/** The categorical dimension an insight is broken down by. */
export function dimensionFor(insight: Insight): Dimension {
  const haystack = `${insight.title} ${insight.group} ${insight.vizLabel}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.test.test(haystack)) return rule.pick(insight);
  }
  // Nothing matched — fall back to the most meaningful default for the context.
  if (isLending(insight)) return LOAN_PRODUCT;
  if (isDeposits(insight)) return DEPOSIT_PRODUCT;
  if (insight.layer === 'corporate') return SECTOR;
  if (insight.layer === 'retail') return SEGMENT;
  return GENERIC;
}

/** All vocabularies, for the Phase 2 coverage report. */
export const ALL_DIMENSIONS: readonly Dimension[] = [
  BRANCH, ASSET_CLASS, SECTOR, SEGMENT, CURRENCY, DEPOSIT_PRODUCT, LOAN_PRODUCT, DIVISION, CHANNEL,
  COMPLAINT_REASON, OPERATIONAL_LOSS, COUNTERPARTY_TYPE, CUSTOMER_TYPE, PL_LINE,
  MATURITY, RATE_BUCKET, DELINQUENCY, STAGE, RATING, AGE_BAND, COUNTRY, TRANSACTION_TYPE,
  COLLATERAL, INCOME_TYPE, EXPENSE_TYPE, INVESTMENT_CLASS, RISK_TYPE, TRADE_PRODUCT,
  RELATIONSHIP_MANAGER, GENERIC,
];

export { BRANCH, DELINQUENCY, MATURITY, SECTOR, SEGMENT, STAGE };

// ---------------------------------------------------------------------------
// Indicator panels
// ---------------------------------------------------------------------------

/**
 * `Heatmap:rag` panels list named indicators, not categories. Four insights use
 * this variant, and each wants its own set — labelling a liquidity early-warning
 * grid with "Current account, Savings account, ..." reads as a bug.
 */
const INDICATOR_SETS: readonly { test: RegExp; rows: readonly string[] }[] = [
  {
    test: /liquidity early[- ]warning|liquidity.*dashboard/,
    rows: ['LCR headroom', 'NSFR headroom', 'Depositor concentration', 'Interbank reliance', 'Cash buffer', 'Intraday position'],
  },
  {
    test: /covenant/,
    rows: ['Leverage ratio', 'Interest cover', 'Current ratio', 'Tangible net worth', 'Capex limit', 'Dividend block'],
  },
  {
    test: /watchlist|early[- ]warning/,
    rows: ['Rating downgrade', 'Payment delay', 'Covenant breach', 'Sector stress', 'Account conduct', 'Collateral shortfall'],
  },
  {
    test: /reporting timeliness|data quality/,
    rows: ['Submission timeliness', 'Reconciliation breaks', 'Field completeness', 'Validation failures', 'Restatements', 'Manual overrides'],
  },
];

/** Indicator row labels for a RAG panel, or `undefined` to use the inferred dimension. */
export function indicatorsFor(title: string): readonly string[] | undefined {
  const haystack = title.toLowerCase();
  return INDICATOR_SETS.find((entry) => entry.test.test(haystack))?.rows;
}
