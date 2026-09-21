/**
 * Packing a report's blocks into rows.
 *
 * The reader never places a block (I5): they add it and the grid decides. Same chunking
 * the section pages use, for the same reason — a full-width card dropped into a
 * half-filled CSS grid row starts a new row and leaves several hundred pixels of nothing
 * mid-page, and `grid-auto-flow: dense` would only close that hole by reordering, which
 * in a report would move somebody's block.
 *
 * Width comes from the same `cardSpan()` the section pages pack with, so a block sits at
 * the width its reader is used to seeing it at.
 */

import { tryBlockDef } from './catalogue.ts';
import type { ReportBlock } from './model.ts';

export function blockWidth(block: ReportBlock): 'half' | 'full' {
  // An unknown id renders a short "no longer in this build" card: half width.
  return tryBlockDef(block.blockId)?.width ?? 'half';
}

export function toBlockRows(blocks: readonly ReportBlock[]): readonly (readonly ReportBlock[])[] {
  const rows: ReportBlock[][] = [];
  let pair: ReportBlock[] = [];

  for (const block of blocks) {
    if (blockWidth(block) === 'full') {
      if (pair.length > 0) {
        rows.push(pair);
        pair = [];
      }
      rows.push([block]);
      continue;
    }
    pair.push(block);
    if (pair.length === 2) {
      rows.push(pair);
      pair = [];
    }
  }
  if (pair.length > 0) rows.push(pair);
  return rows;
}

// ---------------------------------------------------------------------------
// Drag to reorder
// ---------------------------------------------------------------------------

/** Which side of the block under the pointer the dragged block would land on. */
export type DropEdge = 'before' | 'after';

/**
 * The index to hand `moveBlock`, given where the drag started and where it was dropped.
 *
 * The off-by-one here is the whole reason this is a function with a gate rather than three
 * lines inside a drop handler. `moveBlock` splices the block **out** first and then in, so
 * its target is an index in the array *after* removal — while the drop tells us a position
 * in the array the reader is looking at, which still contains the block being moved. Every
 * index at or past the origin has therefore shifted down by one.
 *
 * Getting it wrong is not a crash. It drops the block one place short of where the reader
 * aimed, in one direction only, which reads as a laggy interface rather than as a bug.
 */
export function dropTargetIndex(from: number, over: number, edge: DropEdge): number {
  const insertAt = edge === 'after' ? over + 1 : over;
  return insertAt > from ? insertAt - 1 : insertAt;
}

/**
 * Which edge the pointer is nearer, in the writing direction.
 *
 * `direction` comes from the element rather than being assumed: the shell is built with
 * logical properties throughout for the Arabic in PRD §9, and under RTL the leading edge is
 * on the right. A hardcoded `x < midpoint` would silently invert every drop.
 */
export function edgeFor(rect: DOMRect, x: number, rtl: boolean): DropEdge {
  const past = x > rect.left + rect.width / 2;
  return past === rtl ? 'before' : 'after';
}

// ---------------------------------------------------------------------------
// The nav rail
// ---------------------------------------------------------------------------

/** How many of the reader's reports the header shows before it stops. */
export const RAIL_CAP = 4;

/**
 * What the rail shows, and how many it is not showing.
 *
 * A function because `hidden` is an off-by-one waiting to happen: `reports.length - CAP` is
 * wrong the moment there are fewer reports than the cap, and it reads as "+-2 more" rather
 * than failing.
 */
export function railSlice<T>(
  reports: readonly T[],
  cap = RAIL_CAP,
): { readonly shown: readonly T[]; readonly hidden: number } {
  const shown = reports.slice(0, cap);
  return { shown, hidden: reports.length - shown.length };
}
