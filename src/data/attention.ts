/**
 * The attention strip's callouts (PRD §11.3).
 *
 * Data, not view: these are claims about the bank, computed from the fixture and the
 * generated series. Keeping them here also keeps `verify:tokens` free of the UI import
 * tree — a static gate should not have to load a React component to check a fact.
 */

import type { Filters } from '../types.ts';
import { bank } from './bank.ts';
import { sectors } from './entities.ts';
import { DEFAULT_FILTERS } from './filters.ts';
import { seriesFor } from './seriesFor.ts';
import { formatPercent } from '../design/format.ts';

export interface Callout {
  readonly id: string;
  readonly tone: 'warning' | 'negative' | 'positive';
  readonly text: string;
}

/**
 * Three or four callouts derived from the generated data, each linking to the insight
 * that explains it. This is what makes the screen feel intelligent rather than
 * decorative, and it is demo beat 3: "the dashboard tells you where to look".
 *
 * The copy is pinned to figures read out of the fixture and the generators below, so it
 * cannot contradict the charts. Phase 7 tunes the wording.
 */
export function buildCallouts(filters: Filters): readonly Callout[] {
  const worstSector = [...sectors].sort((a, b) => b.nplRate - a.nplRate)[0];

  /*
   * Every callout must land on an insight that actually renders — `verify:tokens` fails
   * if one points at a panel with no renderer. The concentration callout was held back
   * through Phase 3 because R-17 is a `ParetoChart:lorenz`; Phase 4 built Pareto, so it
   * is restored here. It is demo beat 5.
   *
   * The figure is read out of R-17's own series rather than restated, so the callout
   * cannot drift from the curve it links to.
   */
  const lorenz = seriesFor('R-17', 0, filters);
  const topOnePct =
    lorenz.shape === 'ranked'
      ? (lorenz.items.find((item) => item.key === 'p1')?.cumulativePct ?? 0)
      : 0;

  return [
    {
      id: 'R-43',
      tone: 'warning',
      text: `NPL ratio at ${formatPercent(bank.ratios.nplRatio)} — worst in ${
        worstSector?.name ?? 'Construction'
      } at ${formatPercent(worstSector?.nplRate ?? 0)}`,
    },
    {
      id: 'R-17',
      tone: 'warning',
      text: `${formatPercent(topOnePct)} of deposits sit with the top 1% of customers`,
    },
    {
      id: 'E-04',
      tone: 'positive',
      text: `LCR at ${formatPercent(bank.ratios.lcr)} and NSFR at ${formatPercent(
        bank.ratios.nsfr,
      )} — both comfortably above the 100% floor`,
    },
    {
      id: 'E-02',
      tone: 'warning',
      text: `Cost-to-income at ${formatPercent(bank.ratios.cir)} against a 50.0% target`,
    },
  ];
}


/** The ids the strip points at, under the default selection. */
export const CALLOUT_IDS: readonly string[] = buildCallouts(DEFAULT_FILTERS).map((c) => c.id);

/** The four headline figures, exported so the gate can reconcile them to the fixture. */
export const HEADLINE_VALUES = {
  totalAssets: bank.balanceSheet.totalAssets,
  customerDeposits: bank.balanceSheet.customerDeposits,
  netProfit: bank.income.netProfit,
  car: bank.ratios.car,
} as const;
