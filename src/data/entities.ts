/**
 * Entity fixtures — branches, products, segments, sectors, currencies (PRD §7.2).
 *
 * Every breakdown is apportioned from `bank` with `allocate()`, so each one sums to
 * the fixture **exactly**, to the IQD. That is what satisfies PRD §7.1:
 *
 *   - deposits by product, branch, currency and segment each sum to `customerDeposits`
 *   - loans by product, sector and branch each sum to `grossLoans`
 *
 * Weights are deliberately not round numbers, so subtotals read as `1,230,516,842,105`
 * rather than `1,236,000,000,000` (PRD §7.3: rounded but not suspiciously round).
 * They are expressed as percentages and asserted to sum to 100.
 */

import { bank } from './bank.ts';
import { allocate } from './generators.ts';

const { customerDeposits, grossLoans, nplStock } = bank.balanceSheet;

// ---------------------------------------------------------------------------
// Branches (11)
// ---------------------------------------------------------------------------

export interface Branch {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  /** Longitude, latitude — as PRD §7.2 lists them. For `GeoMap`. */
  readonly lon: number;
  readonly lat: number;
  readonly deposits: number;
  readonly loans: number;
  readonly retailCustomers: number;
  readonly corporateCustomers: number;
  readonly staffFte: number;
  readonly atms: number;
}

/**
 * Deposit weights put Baghdad Main and Erbil Main at 38.00% between them, so the
 * concentration charts have something to show (PRD §7.2). Loan weights differ —
 * corporate lending concentrates in Baghdad and Basra.
 */
const BRANCH_SEED = [
  { id: 'baghdad-main', name: 'Baghdad Main', city: 'Baghdad', lon: 44.39, lat: 33.31, deposit: 21.87, loan: 26.84 },
  { id: 'karrada', name: 'Karrada', city: 'Baghdad', lon: 44.42, lat: 33.3, deposit: 9.42, loan: 7.93 },
  { id: 'erbil-main', name: 'Erbil Main', city: 'Erbil', lon: 44.01, lat: 36.19, deposit: 16.13, loan: 15.12 },
  { id: 'erbil-ankawa', name: 'Erbil Ankawa', city: 'Erbil', lon: 43.99, lat: 36.23, deposit: 6.94, loan: 5.47 },
  { id: 'sulaymaniyah', name: 'Sulaymaniyah', city: 'Sulaymaniyah', lon: 45.43, lat: 35.56, deposit: 8.61, loan: 7.38 },
  { id: 'basra', name: 'Basra', city: 'Basra', lon: 47.78, lat: 30.51, deposit: 9.08, loan: 12.16 },
  { id: 'mosul', name: 'Mosul', city: 'Mosul', lon: 43.13, lat: 36.34, deposit: 5.97, loan: 4.98 },
  { id: 'kirkuk', name: 'Kirkuk', city: 'Kirkuk', lon: 44.39, lat: 35.47, deposit: 5.46, loan: 5.03 },
  { id: 'najaf', name: 'Najaf', city: 'Najaf', lon: 44.32, lat: 32.03, deposit: 6.53, loan: 4.91 },
  { id: 'karbala', name: 'Karbala', city: 'Karbala', lon: 44.02, lat: 32.61, deposit: 5.44, loan: 5.12 },
  { id: 'duhok', name: 'Duhok', city: 'Duhok', lon: 42.99, lat: 36.87, deposit: 4.55, loan: 5.06 },
] as const;

const branchDeposits = allocate(customerDeposits, BRANCH_SEED.map((b) => b.deposit));
const branchLoans = allocate(grossLoans, BRANCH_SEED.map((b) => b.loan));
const branchRetailCustomers = allocate(bank.base.retailCustomers, BRANCH_SEED.map((b) => b.deposit));
const branchCorporateCustomers = allocate(bank.base.corporateCustomers, BRANCH_SEED.map((b) => b.loan));
const branchStaff = allocate(bank.base.staffFte, BRANCH_SEED.map((b) => b.deposit + b.loan));
const branchAtms = allocate(bank.base.atms, BRANCH_SEED.map((b) => b.deposit));

export const branches: readonly Branch[] = BRANCH_SEED.map((seed, index) => ({
  id: seed.id,
  name: seed.name,
  city: seed.city,
  lon: seed.lon,
  lat: seed.lat,
  deposits: branchDeposits[index] ?? 0,
  loans: branchLoans[index] ?? 0,
  retailCustomers: branchRetailCustomers[index] ?? 0,
  corporateCustomers: branchCorporateCustomers[index] ?? 0,
  staffFte: branchStaff[index] ?? 0,
  atms: branchAtms[index] ?? 0,
}));

// ---------------------------------------------------------------------------
// Products (14)
// ---------------------------------------------------------------------------

export type ProductKind = 'deposit' | 'loan' | 'contingent';
export type ProductSide = 'retail' | 'corporate';

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly kind: ProductKind;
  readonly side: ProductSide;
  /** True for current, savings and salary accounts — the CASA numerator. */
  readonly casa: boolean;
  readonly balance: number;
}

/** CASA weights total 71.20, enforcing `bank.ratios.casaRatio`. */
const DEPOSIT_SEED = [
  { id: 'current', name: 'Current account', side: 'corporate', casa: true, weight: 29.87 },
  { id: 'savings', name: 'Savings account', side: 'retail', casa: true, weight: 26.94 },
  { id: 'salary', name: 'Salary account', side: 'retail', casa: true, weight: 14.39 },
  { id: 'term-3m', name: 'Term deposit 3M', side: 'retail', casa: false, weight: 9.93 },
  { id: 'term-6m', name: 'Term deposit 6M', side: 'retail', casa: false, weight: 10.14 },
  { id: 'term-12m', name: 'Term deposit 12M', side: 'corporate', casa: false, weight: 8.73 },
] as const satisfies readonly { id: string; name: string; side: ProductSide; casa: boolean; weight: number }[];

const LOAN_SEED = [
  { id: 'personal-loan', name: 'Personal loan', side: 'retail', weight: 15.83 },
  { id: 'auto-loan', name: 'Auto loan', side: 'retail', weight: 6.94 },
  { id: 'mortgage', name: 'Mortgage', side: 'retail', weight: 12.11 },
  { id: 'overdraft', name: 'Overdraft', side: 'corporate', weight: 9.07 },
  { id: 'corporate-term-loan', name: 'Corporate term loan', side: 'corporate', weight: 36.12 },
  { id: 'revolving-credit', name: 'Revolving credit', side: 'corporate', weight: 19.93 },
] as const satisfies readonly { id: string; name: string; side: ProductSide; weight: number }[];

/**
 * Off-balance-sheet, so excluded from the `grossLoans` apportionment — see the
 * `contingents` note in `bank.ts`. Balances come straight from that fixture.
 */
const CONTINGENT_SEED = [
  { id: 'lc-facility', name: 'LC facility', balance: bank.contingents.letterOfCreditOutstanding },
  { id: 'guarantee-facility', name: 'Guarantee facility', balance: bank.contingents.guaranteesOutstanding },
] as const;

const depositBalances = allocate(customerDeposits, DEPOSIT_SEED.map((p) => p.weight));
const loanBalances = allocate(grossLoans, LOAN_SEED.map((p) => p.weight));

export const depositProducts: readonly Product[] = DEPOSIT_SEED.map((seed, index) => ({
  id: seed.id,
  name: seed.name,
  kind: 'deposit',
  side: seed.side,
  casa: seed.casa,
  balance: depositBalances[index] ?? 0,
}));

export const loanProducts: readonly Product[] = LOAN_SEED.map((seed, index) => ({
  id: seed.id,
  name: seed.name,
  kind: 'loan',
  side: seed.side,
  casa: false,
  balance: loanBalances[index] ?? 0,
}));

export const contingentProducts: readonly Product[] = CONTINGENT_SEED.map((seed) => ({
  id: seed.id,
  name: seed.name,
  kind: 'contingent',
  side: 'corporate',
  casa: false,
  balance: seed.balance,
}));

export const products: readonly Product[] = [
  ...depositProducts,
  ...loanProducts,
  ...contingentProducts,
];

// ---------------------------------------------------------------------------
// Segments (6)
// ---------------------------------------------------------------------------

export interface Segment {
  readonly id: string;
  readonly name: string;
  readonly side: ProductSide;
  readonly deposits: number;
  readonly loans: number;
  readonly customers: number;
}

const SEGMENT_SEED = [
  { id: 'mass', name: 'Mass', side: 'retail', deposit: 25.83, loan: 13.87, customerWeight: 78 },
  { id: 'affluent', name: 'Affluent', side: 'retail', deposit: 18.14, loan: 11.94, customerWeight: 18 },
  { id: 'private', name: 'Private', side: 'retail', deposit: 13.96, loan: 9.11, customerWeight: 4 },
  { id: 'sme', name: 'SME', side: 'corporate', deposit: 12.07, loan: 18.12, customerWeight: 72 },
  { id: 'mid-cap', name: 'Mid-cap', side: 'corporate', deposit: 13.88, loan: 19.83, customerWeight: 22 },
  { id: 'large-corporate', name: 'Large corporate', side: 'corporate', deposit: 16.12, loan: 27.13, customerWeight: 6 },
] as const satisfies readonly {
  id: string; name: string; side: ProductSide; deposit: number; loan: number; customerWeight: number;
}[];

const segmentDeposits = allocate(customerDeposits, SEGMENT_SEED.map((s) => s.deposit));
const segmentLoans = allocate(grossLoans, SEGMENT_SEED.map((s) => s.loan));

const retailSeed = SEGMENT_SEED.filter((s) => s.side === 'retail');
const corporateSeed = SEGMENT_SEED.filter((s) => s.side === 'corporate');
const retailCustomerSplit = allocate(bank.base.retailCustomers, retailSeed.map((s) => s.customerWeight));
const corporateCustomerSplit = allocate(bank.base.corporateCustomers, corporateSeed.map((s) => s.customerWeight));

export const segments: readonly Segment[] = SEGMENT_SEED.map((seed, index) => {
  const customers =
    seed.side === 'retail'
      ? retailCustomerSplit[retailSeed.findIndex((s) => s.id === seed.id)] ?? 0
      : corporateCustomerSplit[corporateSeed.findIndex((s) => s.id === seed.id)] ?? 0;
  return {
    id: seed.id,
    name: seed.name,
    side: seed.side,
    deposits: segmentDeposits[index] ?? 0,
    loans: segmentLoans[index] ?? 0,
    customers,
  };
});

// ---------------------------------------------------------------------------
// Sectors (11)
// ---------------------------------------------------------------------------

export interface Sector {
  readonly id: string;
  readonly name: string;
  readonly loans: number;
  readonly nplStock: number;
  /** Derived: `nplStock / loans`, as a percentage. */
  readonly nplRate: number;
}

/**
 * `nplWeight` is the *relative* NPL rate, not a final percentage — the stock is
 * apportioned from the fixture's total so the sector NPL figures sum to
 * `bank.balanceSheet.nplStock` exactly. Construction carries the worst book,
 * which is what the E-07 and R-43 narrative leans on.
 */
const SECTOR_SEED = [
  { id: 'trade', name: 'Trade', loan: 18.94, nplWeight: 5.5 },
  { id: 'construction', name: 'Construction', loan: 14.07, nplWeight: 13.0 },
  { id: 'manufacturing', name: 'Manufacturing', loan: 11.88, nplWeight: 7.0 },
  { id: 'oil-services', name: 'Oil services', loan: 11.13, nplWeight: 3.0 },
  { id: 'agriculture', name: 'Agriculture', loan: 6.97, nplWeight: 9.0 },
  { id: 'transport', name: 'Transport', loan: 6.04, nplWeight: 6.5 },
  { id: 'healthcare', name: 'Healthcare', loan: 4.96, nplWeight: 4.0 },
  { id: 'education', name: 'Education', loan: 3.88, nplWeight: 3.5 },
  { id: 'real-estate', name: 'Real estate', loan: 9.93, nplWeight: 8.5 },
  { id: 'hospitality', name: 'Hospitality', loan: 5.17, nplWeight: 9.5 },
  { id: 'telecoms', name: 'Telecoms', loan: 7.03, nplWeight: 2.5 },
] as const;

const sectorLoans = allocate(grossLoans, SECTOR_SEED.map((s) => s.loan));
const sectorNpl = allocate(
  nplStock,
  SECTOR_SEED.map((seed, index) => (sectorLoans[index] ?? 0) * seed.nplWeight),
);

export const sectors: readonly Sector[] = SECTOR_SEED.map((seed, index) => {
  const loans = sectorLoans[index] ?? 0;
  const npl = sectorNpl[index] ?? 0;
  return {
    id: seed.id,
    name: seed.name,
    loans,
    nplStock: npl,
    nplRate: loans > 0 ? (npl / loans) * 100 : 0,
  };
});

// ---------------------------------------------------------------------------
// Currencies (4)
// ---------------------------------------------------------------------------

export interface Currency {
  readonly code: string;
  readonly name: string;
  readonly deposits: number;
  /** The share PRD §7.2 states, kept for display and assertion. */
  readonly sharePct: number;
}

/** Shares are stated in PRD §7.2, so these stay exact. */
const CURRENCY_SEED = [
  { code: 'IQD', name: 'Iraqi dinar', share: 78 },
  { code: 'USD', name: 'US dollar', share: 20 },
  { code: 'EUR', name: 'Euro', share: 1.5 },
  { code: 'OTHER', name: 'Other', share: 0.5 },
] as const;

const currencyDeposits = allocate(customerDeposits, CURRENCY_SEED.map((c) => c.share));

export const currencies: readonly Currency[] = CURRENCY_SEED.map((seed, index) => ({
  code: seed.code,
  name: seed.name,
  deposits: currencyDeposits[index] ?? 0,
  sharePct: seed.share,
}));

// ---------------------------------------------------------------------------
// Divisions — for the Division filter and E-06 business mix
// ---------------------------------------------------------------------------

export type Division = 'retail' | 'corporate' | 'treasury';

export const DIVISIONS: readonly Division[] = ['retail', 'corporate', 'treasury'];

// ---------------------------------------------------------------------------
// Load-time assertions — A3 (plan §4)
// ---------------------------------------------------------------------------

function sumOf(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function assertEntities(): void {
  const problems: string[] = [];

  const expectWeights = (label: string, weights: readonly number[]): void => {
    const total = sumOf(weights);
    if (Math.abs(total - 100) > 1e-9) problems.push(`${label} weights sum to ${total}, expected 100`);
  };

  expectWeights('branch deposit', BRANCH_SEED.map((b) => b.deposit));
  expectWeights('branch loan', BRANCH_SEED.map((b) => b.loan));
  expectWeights('deposit product', DEPOSIT_SEED.map((p) => p.weight));
  expectWeights('loan product', LOAN_SEED.map((p) => p.weight));
  expectWeights('segment deposit', SEGMENT_SEED.map((s) => s.deposit));
  expectWeights('segment loan', SEGMENT_SEED.map((s) => s.loan));
  expectWeights('sector loan', SECTOR_SEED.map((s) => s.loan));
  expectWeights('currency', CURRENCY_SEED.map((c) => c.share));

  const expectSum = (label: string, actual: number, expected: number): void => {
    if (actual !== expected) {
      problems.push(`${label} sums to ${actual.toLocaleString()}, expected ${expected.toLocaleString()}`);
    }
  };

  // PRD §7.1 — deposits reconcile four ways
  expectSum('deposits by product', sumOf(depositProducts.map((p) => p.balance)), customerDeposits);
  expectSum('deposits by branch', sumOf(branches.map((b) => b.deposits)), customerDeposits);
  expectSum('deposits by segment', sumOf(segments.map((s) => s.deposits)), customerDeposits);
  expectSum('deposits by currency', sumOf(currencies.map((c) => c.deposits)), customerDeposits);

  // PRD §7.1 — loans reconcile three ways
  expectSum('loans by product', sumOf(loanProducts.map((p) => p.balance)), grossLoans);
  expectSum('loans by branch', sumOf(branches.map((b) => b.loans)), grossLoans);
  expectSum('loans by sector', sumOf(sectors.map((s) => s.loans)), grossLoans);

  expectSum('NPL by sector', sumOf(sectors.map((s) => s.nplStock)), nplStock);
  expectSum('retail customers by branch', sumOf(branches.map((b) => b.retailCustomers)), bank.base.retailCustomers);
  expectSum('corporate customers by branch', sumOf(branches.map((b) => b.corporateCustomers)), bank.base.corporateCustomers);
  expectSum('staff by branch', sumOf(branches.map((b) => b.staffFte)), bank.base.staffFte);
  expectSum('ATMs by branch', sumOf(branches.map((b) => b.atms)), bank.base.atms);
  expectSum('retail customers by segment', sumOf(segments.filter((s) => s.side === 'retail').map((s) => s.customers)), bank.base.retailCustomers);
  expectSum('corporate customers by segment', sumOf(segments.filter((s) => s.side === 'corporate').map((s) => s.customers)), bank.base.corporateCustomers);

  // CASA is declared in bank.ts and must be honoured by this allocation.
  const casa = sumOf(depositProducts.filter((p) => p.casa).map((p) => p.balance));
  const casaRatio = (casa / customerDeposits) * 100;
  if (Math.abs(casaRatio - bank.ratios.casaRatio) > 0.001) {
    problems.push(
      `CASA ratio from deposit products is ${casaRatio.toFixed(4)}%, expected ${bank.ratios.casaRatio}%`,
    );
  }

  // Baghdad Main + Erbil Main ≈ 38% of deposits (PRD §7.2).
  const topTwo = branches
    .filter((branch) => branch.id === 'baghdad-main' || branch.id === 'erbil-main')
    .reduce((total, branch) => total + branch.deposits, 0);
  const topTwoShare = (topTwo / customerDeposits) * 100;
  if (Math.abs(topTwoShare - 38) > 0.5) {
    problems.push(`Baghdad Main + Erbil Main hold ${topTwoShare.toFixed(2)}% of deposits, expected ~38%`);
  }

  // No negatives anywhere (PRD §7.3).
  for (const product of products) {
    if (product.balance <= 0) problems.push(`product ${product.id} has a non-positive balance`);
  }
  for (const branch of branches) {
    if (branch.deposits <= 0 || branch.loans <= 0) problems.push(`branch ${branch.id} has a non-positive balance`);
  }
  for (const sector of sectors) {
    if (sector.nplRate <= 0 || sector.nplRate >= 100) {
      problems.push(`sector ${sector.id} has an impossible NPL rate of ${sector.nplRate}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`entities.ts does not reconcile to bank.ts (PRD §7.1):\n  - ${problems.join('\n  - ')}`);
  }
}

assertEntities();
