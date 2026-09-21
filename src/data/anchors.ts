/**
 * What magnitude is this insight about, and which way does it move?
 *
 * `anchorFor()` maps an insight to the endpoint value its series lands on, the
 * trend direction, the plausible bounds, and any target or regulatory floor. This
 * is the other half of "do not write 163 bespoke cases" (PRD §7.4): the dimension
 * comes from `dimensions.ts`, the magnitude comes from here.
 *
 * Known ratios resolve to the **fixture** value, so E-02's NIM gauge and E-04's LCR
 * gauge read the same numbers the headline band does.
 */

import type { Filters, Insight, Reference, Unit } from '../types.ts';
import { bank } from './bank.ts';
import { levelOffset, magnitudeScale } from './filters.ts';
import { clamp, type Rng } from './generators.ts';

export interface Anchor {
  /** The value the series ends on (PRD §7.1: series end at the fixture value). */
  readonly level: number;
  /** Per-period growth, e.g. 0.011 for deposits at +1.1% a month. */
  readonly growth: number;
  readonly jitter: number;
  readonly min: number;
  readonly max: number | undefined;
  /** PRD §9: down is good for cost, NPL, CIR and impairment. */
  readonly downIsGood: boolean;
  /** Short metric name, for KPI cards, gauges and bullet rows. */
  readonly label: string;
  readonly reference: readonly Reference[];
  /** Applied on top of the geometric baseline, for non-monotonic stories. */
  readonly shape: ((progress: number) => number) | undefined;
  /** Use a logistic curve instead of a geometric trend (digital adoption). */
  readonly logistic: boolean;
  /** Set where a figure needs the PRD Appendix A note 5 caveat. */
  readonly note: string | undefined;
}

const bs = bank.balanceSheet;
const ratios = bank.ratios;

/**
 * NPL drifts up over the window then improves in the last four months of 36
 * (PRD §7.3). Growth is zero for these metrics — the shape is the whole story,
 * and it returns exactly 1 at the end so the endpoint stays on the fixture.
 */
function nplDrift(progress: number): number {
  const peak = 32 / 35;
  if (progress <= peak) return 0.86 + 0.2 * (progress / peak);
  return 1.06 - 0.06 * ((progress - peak) / (1 - peak));
}

/** A mild seasonal wobble for metrics with no real trend. */
function flatWithCycle(progress: number): number {
  return 1 + 0.035 * Math.sin(progress * Math.PI * 4);
}

interface AnchorRule {
  readonly test: RegExp;
  readonly level: number;
  readonly label: string;
  /**
   * Take the label from the insight's title instead of the static one above.
   *
   * Set on the catch-all rules. "Ratio", "Value" and "Count" are honest about the
   * *shape* of a metric and useless as a name — 69 of the 163 insights were labelling
   * their KPI cards, gauges and bullet rows that way. The first clause of the title is
   * the metric's actual name.
   */
  readonly genericLabel?: boolean;
  readonly growth?: number;
  readonly target?: number;
  readonly floor?: number;
  readonly downIsGood?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly shape?: (progress: number) => number;
  readonly logistic?: boolean;
  readonly note?: string;
}

/*
 * The caveat used to end "(Methodology note 5)". That page was removed (plan §2.23), so the
 * pointer went nowhere — a reference to a document the reader cannot open is worse than no
 * reference. The substance moves inline instead, where it is read anyway.
 */
const FTP_NOTE =
  'Revenue-only proxy — a true margin measure needs an FTP engine and cost allocation, neither of which this demonstration models.';

/**
 * Ratio metrics, resolved to the fixture so every screen agrees. First match wins.
 */
const PERCENT_RULES: readonly AnchorRule[] = [
  { test: /net interest margin|\bnim\b/, level: ratios.nim, label: 'NIM', target: 3.6, growth: 0.001, max: 8 },
  { test: /cost[- ]to[- ]income|\bcir\b|efficiency ratio/, level: ratios.cir, label: 'CIR', target: 50, downIsGood: true, growth: -0.001, max: 100 },
  { test: /\broe\b|return on equity/, level: ratios.roe, label: 'ROE', target: 13, growth: 0.002, max: 40 },
  { test: /\broa\b|return on assets/, level: ratios.roa, label: 'ROA', target: 1.5, growth: 0.002, max: 6 },
  { test: /capital adequacy|\bcar\b/, level: ratios.car, label: 'CAR', target: 18, floor: 12.5, growth: 0.001, max: 30 },
  { test: /cet ?1|common equity/, level: ratios.cet1, label: 'CET1', target: 15, floor: 9, growth: 0.001, max: 30 },
  { test: /\blcr\b|liquidity coverage/, level: ratios.lcr, label: 'LCR', floor: 100, target: 130, growth: 0.001, max: 260 },
  { test: /\bnsfr\b|stable funding/, level: ratios.nsfr, label: 'NSFR', floor: 100, target: 115, growth: 0.001, max: 220 },
  { test: /loan[- ]to[- ]deposit|\bldr\b/, level: ratios.ldr, label: 'LDR', target: 60, growth: 0.003, max: 120 },
  { test: /\bcasa\b|current and savings/, level: ratios.casaRatio, label: 'CASA ratio', target: 70, growth: 0.001, max: 100 },
  { test: /collateral|security coverage|\bltv\b/, level: 78.2, label: 'Collateral coverage', target: 80, growth: 0.002, max: 200 },
  { test: /coverage/, level: ratios.nplCoverage, label: 'NPL coverage', target: 80, growth: 0.002, max: 160 },
  { test: /\bnpl\b|non[- ]performing|impair|default rate|delinquen/, level: ratios.nplRatio, label: 'NPL ratio', target: 5, downIsGood: true, growth: 0, shape: nplDrift, max: 30 },
  { test: /cost of risk|credit cost/, level: 1.34, label: 'Cost of risk', target: 1.1, downIsGood: true, growth: 0, shape: nplDrift, max: 8 },
  { test: /utilisation|utilization|drawn/, level: 64.8, label: 'Utilisation', target: 70, growth: 0.002, max: 100 },
  { test: /approval rate|acceptance/, level: 71.4, label: 'Approval rate', target: 75, growth: 0.002, max: 100 },
  { test: /attrition|churn|closure/, level: 7.9, label: 'Attrition', target: 6, downIsGood: true, growth: -0.002, max: 40 },
  { test: /retention|survival|stickiness/, level: 88.6, label: 'Retention', target: 90, growth: 0.002, max: 100 },
  { test: /digital adoption|active digital|digital penetration|adoption/, level: 27.9, label: 'Digital adoption', target: 35, logistic: true, max: 100 },
  { test: /market share/, level: 4.6, label: 'Market share', target: 5.5, growth: 0.003, max: 40 },
  { test: /growth|yoy|mom|increase/, level: 1.24, label: 'Growth', target: 1.5, growth: 0.004, min: -8, max: 14 },
  { test: /concentration|top ?\d|herfindahl|\bhhi\b/, level: 34.2, label: 'Concentration', target: 30, downIsGood: true, growth: 0.001, max: 100 },
  { test: /yield|pricing|spread|beta/, level: 9.4, label: 'Yield', target: 10, growth: 0.002, max: 30 },
  { test: /compliance|timeliness|completeness|quality/, level: 96.2, label: 'Compliance', target: 99, growth: 0.001, max: 100 },
  { test: /share|mix|proportion|penetration|composition/, level: 42.6, label: 'Share', genericLabel: true, growth: 0.002, max: 100 },
];

const IQD_RULES: readonly AnchorRule[] = [
  { test: /\bnpl\b|non[- ]performing/, level: bs.nplStock, label: 'NPL stock', growth: 0, shape: nplDrift, downIsGood: true },
  { test: /risk[- ]weighted|\brwa\b/, level: bank.aggregates.riskWeightedAssets, label: 'RWA', growth: 0.011 },
  { test: /total asset|balance sheet size|balance sheet structure|asset composition|asset deployment|asset mix|balance sheet growth/, level: bs.totalAssets, label: 'Total assets', growth: 0.012 },
  { test: /\blc\b|letter of credit|guarantee|trade finance|off[- ]balance/, level: bank.contingents.letterOfCreditOutstanding + bank.contingents.guaranteesOutstanding, label: 'Contingent exposure', growth: 0.013 },
  { test: /deposit|funding|casa|liabilit|current account|savings/, level: bs.customerDeposits, label: 'Customer deposits', growth: 0.011 },
  { test: /loan|lend|credit exposure|advance|facility|mortgage|overdraft|disburse|exposure/, level: bs.grossLoans, label: 'Gross loans', growth: 0.016 },
  { test: /investment|securities|portfolio/, level: bs.investmentSecurities, label: 'Investment securities', growth: 0.008 },
  { test: /interbank|placement/, level: bs.interbankPlacements, label: 'Interbank placements', growth: 0.006 },
  { test: /cash|central bank|reserve/, level: bs.cashAndCentralBank, label: 'Cash & central bank', growth: 0.009 },
  { test: /equity|capital base|own funds/, level: bs.equity, label: 'Equity', growth: 0.009 },
  { test: /cost|expense|opex|staff/, level: -bank.incomeMonthly.operatingExpenses, label: 'Operating expenses', growth: 0.006, downIsGood: true },
  { test: /impairment|\becl\b|provision charge|loan loss/, level: -bank.incomeMonthly.impairmentCharge, label: 'Impairment charge', growth: 0, shape: nplDrift, downIsGood: true },
  { test: /profit|bottom line|earnings/, level: bank.income.netProfit, label: 'Net profit', growth: 0.01 },
  { test: /fee|commission/, level: bank.incomeMonthly.feesAndCommissions, label: 'Fees & commissions', growth: 0.012 },
  { test: /\bfx\b|trading/, level: bank.incomeMonthly.fxAndTrading, label: 'FX & trading income', growth: 0.009 },
  { test: /income|revenue|margin|\bnii\b|p&l/, level: bank.income.operatingIncome, label: 'Operating income', growth: 0.009, note: FTP_NOTE },
  { test: /transaction|payment|throughput|volume|spend|salary inflow/, level: Math.round(bs.customerDeposits * 0.32), label: 'Transaction value', growth: 0.014 },
  { test: /ticket|average balance|per customer|\bclv\b|lifetime value/, level: Math.round(bs.customerDeposits / bank.base.totalAccounts), label: 'Average balance', growth: 0.007 },
  { test: /collateral|security/, level: Math.round(bs.grossLoans * 0.78), label: 'Collateral value', growth: 0.012 },
  { test: /withdrawal|outflow|attrition/, level: Math.round(bs.customerDeposits * 0.031), label: 'Outflow', growth: 0.008, downIsGood: true },
];

const COUNT_RULES: readonly AnchorRule[] = [
  { test: /active digital|digital user|mobile user|app user|adoption/, level: bank.base.activeDigitalUsers, label: 'Active digital users', logistic: true },
  { test: /total account|account base|number of account/, level: bank.base.totalAccounts, label: 'Total accounts', growth: 0.009 },
  { test: /new account|account opened|new customer|acquisition|onboard/, level: 6_240, label: 'New accounts', growth: 0.013 },
  { test: /customer base|total customer|client base|relationship/, level: bank.base.retailCustomers + bank.base.corporateCustomers, label: 'Customers', growth: 0.01 },
  { test: /\batm\b/, level: bank.base.atms, label: 'ATMs', growth: 0.003 },
  // Tight on purpose: a loose /branch/ turned any title mentioning branches into a
  // count of the bank's 11 branches.
  { test: /number of branch|branch count|branch footprint|branch network size/, level: bank.base.branches, label: 'Branches', growth: 0.001 },
  { test: /staff|\bfte\b|headcount|employee/, level: bank.base.staffFte, label: 'Staff FTE', growth: 0.004 },
  { test: /card/, level: 187_400, label: 'Cards in issue', growth: 0.012 },
  { test: /alert|\bstr\b|\bsar\b|suspicious|case/, level: 428, label: 'Alerts', growth: 0.008, downIsGood: true },
  { test: /application|applied|lead/, level: 8_620, label: 'Applications', growth: 0.011 },
  { test: /transaction|payment|throughput|volume/, level: 2_418_000, label: 'Transactions', growth: 0.014 },
  { test: /complaint|breach|exception|incident|downtime|error/, level: 312, label: 'Exceptions', growth: -0.004, downIsGood: true },
  { test: /product per|cross[- ]sell|holding/, level: 2, label: 'Products per customer', growth: 0.004, max: 8 },
];

function firstMatch(rules: readonly AnchorRule[], haystack: string): AnchorRule | undefined {
  return rules.find((rule) => rule.test.test(haystack));
}

/**
 * What a metric is called — title and section only.
 *
 * `whatItTells` is deliberately excluded. It is business prose, and matching against
 * it misclassified metrics badly: "Revenue diversification beyond lending spreads"
 * made G-03 a *yield* metric capped at 30%, and "feeds branch network and digital
 * investment decisions" made R-10's channel mix a count of the bank's 11 branches.
 * The title is the metric's name; the prose is about why it matters.
 */
function metricHaystack(insight: Insight): string {
  return `${insight.title} ${insight.group}`.toLowerCase();
}

function fallbackFor(insight: Insight, rng: Rng): AnchorRule {
  switch (insight.unit) {
    case 'percent':
      return { test: /./, level: 18 + rng() * 54, label: 'Ratio', genericLabel: true, growth: 0.002, max: 100 };
    case 'count':
      return { test: /./, level: Math.round(1_200 + rng() * 46_000), label: 'Count', genericLabel: true, growth: 0.009 };
    case 'iqd':
    default:
      return {
        test: /./,
        level: Math.round(bs.customerDeposits * (0.04 + rng() * 0.12)),
        label: 'Value',
        genericLabel: true,
        growth: 0.01,
      };
  }
}

/**
 * The metric's name, taken from the first clause of the insight's title.
 *
 * "Net interest income (NII) & margin trend" -> "Net interest income".
 * "Total active customers & growth (MoM/YoY)" -> "Total active customers".
 * Parentheticals go first because they are almost always an abbreviation or a gloss.
 */
function labelFromTitle(insight: Insight): string {
  const stripped = insight.title.replace(/\s*\([^)]*\)/g, '').trim();
  const clause = stripped.split(/\s+&\s+|\s+\/\s+|,\s+|\s+vs\.?\s+|\s+—\s+|\s+-\s+/i)[0]?.trim() ?? stripped;
  const name = clause.length >= 3 ? clause : stripped;
  return name.length > 30 ? `${name.slice(0, 29).trimEnd()}…` : name;
}

function rulesFor(unit: Unit): readonly AnchorRule[] {
  switch (unit) {
    case 'percent':
      return PERCENT_RULES;
    case 'count':
      return COUNT_RULES;
    case 'iqd':
    default:
      return IQD_RULES;
  }
}

function buildAnchor(rule: AnchorRule, insight: Insight, filters: Filters, rng: Rng): Anchor {
  const scale = magnitudeScale(filters, insight.unit);
  const offset = insight.unit === 'percent' ? levelOffset(filters, rng()) : 0;

  const max = rule.max;
  const min = rule.min ?? 0;
  const scaled = rule.level * scale + offset;
  const level = clamp(scaled, min, max ?? Number.MAX_SAFE_INTEGER);

  const reference: Reference[] = [];
  if (rule.target !== undefined) {
    reference.push({ label: 'Target', value: rule.target, kind: 'target' });
  }
  if (rule.floor !== undefined) {
    reference.push({ label: 'Regulatory minimum', value: rule.floor, kind: 'floor' });
  }

  return {
    level,
    growth: rule.growth ?? 0.008,
    // Enough wobble to look real, little enough that a +1.1%/month trend still
    // reads as growth rather than noise (PRD §7.3 wants direction to be visible).
    jitter: 0.015,
    min,
    max,
    downIsGood: rule.downIsGood ?? false,
    label: rule.genericLabel ? labelFromTitle(insight) : rule.label,
    reference,
    shape: rule.shape ?? (rule.growth === 0 ? flatWithCycle : undefined),
    logistic: rule.logistic ?? false,
    note: rule.note,
  };
}

/**
 * Resolve an insight to its magnitude, trend and thresholds under the given filters.
 *
 * `rng` must be the panel's own seeded generator, so the fallback levels are stable.
 */
export function anchorFor(insight: Insight, filters: Filters, rng: Rng): Anchor {
  const haystack = metricHaystack(insight);
  const rule = firstMatch(rulesFor(insight.unit), haystack) ?? fallbackFor(insight, rng);
  return buildAnchor(rule, insight, filters, rng);
}

/**
 * Several metrics from one title — the general fix for plan §2.8.
 *
 * E-02 is a single `GaugeChart` panel that must show NIM *and* CIR; E-04 shows LCR,
 * NSFR *and* LDR; E-03 is one bullet panel for ROE *and* ROA. Rather than special-case
 * them, split the title on `&`, `,` and `/` and resolve each fragment against the
 * rules. Titles that name one metric fall back to a single anchor, so gauges, bullet
 * rows and KPI cards all get the right cardinality from the same mechanism.
 */
export function anchorsFromTitle(
  insight: Insight,
  filters: Filters,
  rng: Rng,
  limit = 4,
): readonly Anchor[] {
  const rules = rulesFor(insight.unit);
  const fragments = insight.title
    .split(/\s*[&,/]\s*|\s+vs\.?\s+/i)
    .map((fragment) => fragment.trim().toLowerCase())
    .filter((fragment) => fragment.length >= 3);

  const matched: AnchorRule[] = [];
  for (const fragment of fragments) {
    const rule = firstMatch(rules, fragment);
    if (rule && !matched.includes(rule)) matched.push(rule);
  }

  if (matched.length < 2) return [anchorFor(insight, filters, rng)];
  return matched.slice(0, limit).map((rule) => buildAnchor(rule, insight, filters, rng));
}

/** PRD §9: encode delta direction per metric, not per sign. */
export function isDownGood(insight: Insight): boolean {
  const rule = firstMatch(rulesFor(insight.unit), metricHaystack(insight));
  return rule?.downIsGood ?? false;
}
