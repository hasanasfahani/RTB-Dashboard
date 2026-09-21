/**
 * The uniform chart prop contract (PRD §8), frozen at the end of Phase 3 (A6).
 *
 * Fifteen more components land in Phase 4 against this, so it does not change after
 * this phase without a note in the plan.
 *
 * ## One deviation from PRD §8
 *
 * PRD §8 lists `unit` and `reference` as separate props. They are not, because Phase
 * 2's `ChartData` already carries both: every shape has `unit`, and `reference` is
 * emitted by the shape generator that knows whether the metric has a target or a
 * regulatory floor. Passing them alongside `data` would mean two sources for the same
 * fact and an obvious way for them to disagree. Charts read `data.unit` and
 * `data.reference`.
 */

import type { ReactElement } from 'react';
import type { ChartComponent, ChartData, ChartVariant } from '../../types.ts';

export const DEFAULT_CHART_HEIGHT = 240;
/** Inside a catalogue grid card. PRD §8: no axis labels colliding at this size. */
export const COMPACT_CHART_HEIGHT = 160;

export interface ChartProps<D extends ChartData = ChartData> {
  readonly data: D;
  readonly variant: ChartVariant;
  /** Defaults to 240, or 160 when `compact`. */
  readonly height?: number;
  readonly compact?: boolean;
}

export type ChartRenderer = (props: ChartProps) => ReactElement | null;

/**
 * Component name -> renderer. Phase 3 registers 8; Phase 4 registers the rest.
 * A missing entry renders a labelled placeholder, which PRD §13 forbids by Phase 5.
 */
export type ChartRegistry = Partial<Record<ChartComponent, ChartRenderer>>;

export function resolveHeight(props: {
  height?: number | undefined;
  compact?: boolean | undefined;
}): number {
  if (props.height !== undefined) return props.height;
  return props.compact ? COMPACT_CHART_HEIGHT : DEFAULT_CHART_HEIGHT;
}
