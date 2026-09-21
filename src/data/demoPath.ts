/**
 * Bespoke data for the 36 `demoPath` insights.
 *
 * PRD §7.4 permits hand-written cases here and nowhere else. It does not require
 * all 36 to be hand-written, and most do not need it: their anchors already resolve
 * to the `bank` fixture, so E-02's gauges read 3.44% and 52.4%, E-04's read 142 and
 * 118, and R-17's Lorenz passes through the §7.3 anchors — all from the generic path.
 *
 * Two narrative beats do need shaping the generic path cannot infer, and they are
 * registered below. The registry is the hook Phase 5 uses to tune demo copy against
 * the generated numbers, keyed by `id` and panel index.
 */

import type { ChartData } from '../types.ts';
import { DIVISION_SHARE, isDefaultFilters } from './filters.ts';
import { allocateScaled } from './generators.ts';
import { kpiShape, type ShapeContext } from './shapes.ts';

export type DemoOverride = (ctx: ShapeContext) => ChartData;

/**
 * `${id}:${panelIndex}`. Anything absent falls through to the generic shape
 * generators, which is the intended default.
 */
export const DEMO_PATH_OVERRIDES: Readonly<Record<string, DemoOverride>> = {
  /**
   * E-06 panel 0 — the revenue split across Retail, Corporate and Treasury.
   * The generic path would apportion by deposit balances, which understates
   * Treasury: it earns on the securities book, not on customer deposits.
   *
   * The insight's unit is `percent`, so these are shares summing to 100. Filters
   * tilt the mix and it is renormalised, so the donut still adds up.
   */
  'E-06:0': (ctx) => {
    const divisions = [
      { key: 'retail', label: 'Retail', share: DIVISION_SHARE.retail },
      { key: 'corporate', label: 'Corporate', share: DIVISION_SHARE.corporate },
      { key: 'treasury', label: 'Treasury', share: DIVISION_SHARE.treasury },
    ];
    // A filter tilts the mix rather than shrinking it — a share cannot shrink. The
    // tilt is narrow and only applied when a filter is active, so the unfiltered
    // donut reads exactly 46/41/13 and no filter can reorder the three divisions.
    const active = !isDefaultFilters(ctx.filters);
    const tilted = divisions.map((division) => ({
      ...division,
      weight: division.share * (active ? 1 + (ctx.rng() * 2 - 1) * 0.07 : 1),
    }));
    const values = allocateScaled(100, tilted.map((division) => division.weight), 2);
    return {
      shape: 'breakdown',
      unit: ctx.insight.unit,
      total: 100,
      slices: tilted.map((division, index) => ({
        key: division.key,
        label: division.label,
        value: values[index] ?? 0,
      })),
    };
  },

  /**
   * E-07 panel 1 — NPL ratio and coverage as KPI cards. The generic path already
   * resolves both metrics and builds the sparklines; the demo line is "the ratio
   * moved, coverage held", so only the deltas are pinned.
   */
  'E-07:1': (ctx) => {
    const generic = kpiShape(ctx);
    const pinned: Readonly<Record<string, number>> = { 'NPL ratio': -5.6, 'NPL coverage': 1.6 };
    return {
      ...generic,
      cards: generic.cards.map((card) => {
        const delta = pinned[card.label];
        return delta === undefined ? card : { ...card, deltaPct: delta };
      }),
    };
  },
};

export function demoOverrideFor(id: string, panelIndex: number): DemoOverride | undefined {
  return DEMO_PATH_OVERRIDES[`${id}:${panelIndex}`];
}
