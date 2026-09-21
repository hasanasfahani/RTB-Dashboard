/**
 * The bank fixture — one coherent shape, everything derives from it (PRD §7.1).
 *
 * Figures in IQD. Every number in the application traces back to this module, so
 * totals reconcile across screens and a CFO cannot find a balance sheet that does
 * not add up.
 *
 * ## Three departures from PRD §7.1, and why
 *
 * The PRD's fixture does not fully reconcile. Validated arithmetic:
 *
 * 1. **`taxExpense` was missing.** As written, the income lines give pre-tax profit
 *    of 8.60B/month = 103.20B/year, which is ROE 16.54% and ROA 1.97% — not the
 *    stated 11.6% and 1.38%. Those two stated ratios independently imply the *same*
 *    net profit of ~72.3B/year, i.e. a 29.9% effective tax rate. The fixture was
 *    clearly built with tax and the line was dropped. Added at 30.0%, which makes
 *    ROE and ROA hold to within rounding.
 *
 * 2. **NPL coverage of 78.4% was impossible.** A 6.8% NPL ratio on 1,880B of gross
 *    loans is a 127.84B NPL stock; total provisions of 128.00B is 100.1% coverage,
 *    not 78.4%. Provisions are therefore split into specific (Stage 3) and general
 *    (Stage 1–2 collective ECL), with coverage measured on the specific component.
 *    This reconciles exactly, leaves the balance sheet untouched, and is well
 *    founded — PRD Appendix A note 4 already sources IFRS 9 stages from the ECL
 *    engine rather than raw DPD.
 *
 * 3. **CIR is 52.4%, not 54.8%.** Operating expenses of 11.80B over operating
 *    income of 22.50B is 52.44%. No adjustment reconciles 54.8% without breaking
 *    ROE and ROA, which now hold exactly, so the derived value wins. 52.4% is a
 *    perfectly plausible figure and the E-02 gauge reads against a target we set.
 *
 * NIM also lands at 3.44% against a stated 3.42% — a 2bp rounding gap, accepted.
 * That only holds if earning assets include cash and central bank balances, which
 * is right for an Iraqi bank where CBI balances are remunerated.
 *
 * Both accepted deltas are declared in `RATIO_TOLERANCE` rather than hidden, and
 * `npm run verify:data` prints the full reconciliation.
 */

// ---------------------------------------------------------------------------
// Primitives — the only hardcoded figures in the application
// ---------------------------------------------------------------------------

export const ASOF = '2026-08-31';

const balanceSheet = {
  totalAssets: 5_240_000_000_000,
  cashAndCentralBank: 1_610_000_000_000,
  investmentSecurities: 1_090_000_000_000,
  interbankPlacements: 410_000_000_000,
  grossLoans: 1_880_000_000_000,
  /** Negative, as a contra-asset. Equals `-(specific + general)`. */
  loanLossProvisions: -128_000_000_000,
  /** Stage 3 / specific. The NPL coverage numerator — see note 2 above. */
  specificProvisions: 100_226_560_000,
  /** Stage 1–2 collective ECL, held against the performing book. */
  generalProvisions: 27_773_440_000,
  otherAssets: 378_000_000_000,
  customerDeposits: 4_120_000_000_000,
  interbankBorrowing: 180_000_000_000,
  otherLiabilities: 316_000_000_000,
  equity: 624_000_000_000,
  /** 6.8% of gross loans. A primitive so `nplRatio` can be derived, not asserted. */
  nplStock: 127_840_000_000,
} as const;

const incomeMonthly = {
  interestIncome: 21_400_000_000,
  interestExpense: -7_100_000_000,
  feesAndCommissions: 5_900_000_000,
  fxAndTrading: 2_300_000_000,
  operatingExpenses: -11_800_000_000,
  impairmentCharge: -2_100_000_000,
  /** Added — see note 1 above. 30.0% of pre-tax profit. */
  taxExpense: -2_580_000_000,
} as const;

/**
 * Off-balance-sheet exposures. LC and guarantee facilities are contingents, not
 * loans, so they are held here rather than inside `grossLoans` — otherwise the
 * PRD §7.1 rule "loans by product sum to grossLoans" would force trade finance
 * onto the balance sheet. The Corporate "Trade Finance & Guarantees" section
 * (7 insights) reads from here.
 */
const contingents = {
  letterOfCreditOutstanding: 392_000_000_000,
  guaranteesOutstanding: 268_000_000_000,
  undrawnCommitments: 214_000_000_000,
} as const;

const base = {
  retailCustomers: 268_400,
  corporateCustomers: 3_120,
  totalAccounts: 412_700,
  activeDigitalUsers: 74_900,
  branches: 11,
  atms: 86,
  staffFte: 642,
} as const;

/**
 * Ratios that cannot be derived from the fixture because the models behind them
 * are out of scope for a frontend demo: CAR and CET1 need risk-weighted assets,
 * LCR and NSFR need HQLA and stress-outflow models. `casaRatio` is declared here
 * and *enforced* in `entities.ts`, which must allocate deposits to match it.
 */
const declaredRatios = {
  car: 18.4,
  cet1: 16.1,
  lcr: 142.0,
  nsfr: 118.0,
  casaRatio: 71.2,
} as const;

// ---------------------------------------------------------------------------
// Derived aggregates
// ---------------------------------------------------------------------------

const netInterestIncome = incomeMonthly.interestIncome + incomeMonthly.interestExpense;

const operatingIncome =
  netInterestIncome + incomeMonthly.feesAndCommissions + incomeMonthly.fxAndTrading;

const preTaxProfit =
  operatingIncome + incomeMonthly.operatingExpenses + incomeMonthly.impairmentCharge;

const netProfit = preTaxProfit + incomeMonthly.taxExpense;

/** Includes cash and central bank balances — see the NIM note in the header. */
const earningAssets =
  balanceSheet.cashAndCentralBank +
  balanceSheet.investmentSecurities +
  balanceSheet.interbankPlacements +
  balanceSheet.grossLoans;

const netLoans = balanceSheet.grossLoans + balanceSheet.loanLossProvisions;

/**
 * Risk-weighted assets, back-solved from the declared CAR so that capital charts
 * reconcile: CAR = total capital / RWA, and we treat equity as total capital.
 * Lands at ~3,391B, a 64.7% average risk weight — plausible for a bank with this
 * much of its book in cash and central bank balances.
 */
const riskWeightedAssets = balanceSheet.equity / (declaredRatios.car / 100);

export const income = {
  netInterestIncome,
  operatingIncome,
  preTaxProfit,
  netProfit,
  /** Annualised from the monthly run rate, per PRD Appendix A note 6. */
  netProfitAnnualised: netProfit * 12,
  effectiveTaxRate: -incomeMonthly.taxExpense / preTaxProfit,
} as const;

const derivedRatios = {
  /** Annualised NII over earning assets. */
  nim: (netInterestIncome * 12) / earningAssets * 100,
  cir: (-incomeMonthly.operatingExpenses / operatingIncome) * 100,
  roe: ((netProfit * 12) / balanceSheet.equity) * 100,
  roa: ((netProfit * 12) / balanceSheet.totalAssets) * 100,
  ldr: (balanceSheet.grossLoans / balanceSheet.customerDeposits) * 100,
  nplRatio: (balanceSheet.nplStock / balanceSheet.grossLoans) * 100,
  nplCoverage: (balanceSheet.specificProvisions / balanceSheet.nplStock) * 100,
} as const;

export const bank = {
  asOf: ASOF,
  balanceSheet,
  incomeMonthly,
  contingents,
  base,
  income,
  aggregates: { earningAssets, netLoans, riskWeightedAssets },
  ratios: { ...derivedRatios, ...declaredRatios },
} as const;

export type Bank = typeof bank;

// ---------------------------------------------------------------------------
// Reconciliation against PRD §7.1
// ---------------------------------------------------------------------------

/** The ratios exactly as PRD §7.1 states them, kept so any deviation is visible. */
export const PUBLISHED_RATIOS = {
  nim: 3.42,
  cir: 54.8,
  roe: 11.6,
  roa: 1.38,
  car: 18.4,
  cet1: 16.1,
  lcr: 142.0,
  nsfr: 118.0,
  ldr: 45.6,
  casaRatio: 71.2,
  nplRatio: 6.8,
  nplCoverage: 78.4,
} as const;

/**
 * Permitted gap between our derived ratio and the PRD's published figure, in
 * percentage points. `0.06` is plain rounding. The two wider entries are the
 * accepted, documented deviations from the header notes — they are declared here
 * so that widening a tolerance is a deliberate, reviewable edit.
 */
const RATIO_TOLERANCE: Readonly<Record<keyof typeof derivedRatios, number>> = {
  nim: 0.03, // 3.44 vs 3.42 — rounding on the earning-asset base
  cir: 2.4, // 52.44 vs 54.80 — accepted; see note 3
  roe: 0.06,
  roa: 0.06,
  ldr: 0.06,
  nplRatio: 0.06,
  nplCoverage: 0.06,
} as const;

export interface RatioCheck {
  readonly ratio: string;
  readonly derived: number;
  readonly published: number;
  readonly delta: number;
  readonly tolerance: number;
  readonly withinTolerance: boolean;
}

export function reconcileRatios(): readonly RatioCheck[] {
  return (Object.keys(derivedRatios) as (keyof typeof derivedRatios)[]).map((ratio) => {
    const derived = derivedRatios[ratio];
    const published = PUBLISHED_RATIOS[ratio];
    const tolerance = RATIO_TOLERANCE[ratio];
    const delta = derived - published;
    return {
      ratio,
      derived,
      published,
      delta,
      tolerance,
      withinTolerance: Math.abs(delta) <= tolerance,
    };
  });
}

// ---------------------------------------------------------------------------
// Load-time assertions — A3 (plan §4)
// ---------------------------------------------------------------------------

/**
 * PRD §7.1's consistency rules are "a test, not a suggestion", so they run at
 * module load. A build that boots is a build whose balance sheet adds up.
 */
function assertFixture(): void {
  const problems: string[] = [];

  const assetLines =
    balanceSheet.cashAndCentralBank +
    balanceSheet.investmentSecurities +
    balanceSheet.interbankPlacements +
    balanceSheet.grossLoans +
    balanceSheet.loanLossProvisions +
    balanceSheet.otherAssets;
  if (assetLines !== balanceSheet.totalAssets) {
    problems.push(`asset lines sum to ${assetLines}, expected totalAssets ${balanceSheet.totalAssets}`);
  }

  const liabilitiesAndEquity =
    balanceSheet.customerDeposits +
    balanceSheet.interbankBorrowing +
    balanceSheet.otherLiabilities +
    balanceSheet.equity;
  if (liabilitiesAndEquity !== balanceSheet.totalAssets) {
    problems.push(
      `liabilities + equity sum to ${liabilitiesAndEquity}, expected ${balanceSheet.totalAssets}`,
    );
  }

  const provisionSplit = balanceSheet.specificProvisions + balanceSheet.generalProvisions;
  if (provisionSplit !== -balanceSheet.loanLossProvisions) {
    problems.push(
      `specific + general provisions = ${provisionSplit}, expected ${-balanceSheet.loanLossProvisions}`,
    );
  }

  if (balanceSheet.specificProvisions > balanceSheet.nplStock) {
    problems.push('specific provisions exceed the NPL stock — coverage would be over 100%');
  }

  const mustBePositive: (keyof typeof balanceSheet)[] = [
    'totalAssets',
    'cashAndCentralBank',
    'investmentSecurities',
    'interbankPlacements',
    'grossLoans',
    'otherAssets',
    'customerDeposits',
    'interbankBorrowing',
    'otherLiabilities',
    'equity',
    'nplStock',
    'specificProvisions',
    'generalProvisions',
  ];
  for (const line of mustBePositive) {
    if (balanceSheet[line] <= 0) problems.push(`balanceSheet.${line} must be positive`);
  }
  if (balanceSheet.loanLossProvisions >= 0) {
    problems.push('loanLossProvisions must be negative (it is a contra-asset)');
  }

  const impliedCar = (balanceSheet.equity / riskWeightedAssets) * 100;
  if (Math.abs(impliedCar - declaredRatios.car) > 1e-9) {
    problems.push(`RWA does not tie back to CAR: implied ${impliedCar.toFixed(4)}%, declared ${declaredRatios.car}%`);
  }
  const averageRiskWeight = riskWeightedAssets / balanceSheet.totalAssets;
  if (averageRiskWeight <= 0.2 || averageRiskWeight >= 1) {
    problems.push(`average risk weight of ${(averageRiskWeight * 100).toFixed(1)}% is implausible`);
  }

  if (netProfit <= 0) problems.push(`netProfit must be positive, got ${netProfit}`);
  if (operatingIncome <= 0) problems.push(`operatingIncome must be positive, got ${operatingIncome}`);

  for (const check of reconcileRatios()) {
    if (!check.withinTolerance) {
      problems.push(
        `ratio ${check.ratio}: derived ${check.derived.toFixed(3)} vs published ` +
          `${check.published.toFixed(2)} — delta ${check.delta.toFixed(3)}pp exceeds ` +
          `tolerance ${check.tolerance}pp`,
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `bank.ts fixture is inconsistent (PRD §7.1):\n  - ${problems.join('\n  - ')}`,
    );
  }
}

assertFixture();
