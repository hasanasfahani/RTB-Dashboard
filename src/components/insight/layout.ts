import { shapeFor, type ChartShape, type Insight } from '../../types.ts';

/** Shapes that read better across two columns than one. */
const WIDE_SHAPES: ReadonlySet<ChartShape> = new Set<ChartShape>([
  'timeSeries',
  'ranked',
  'matrix',
  'flows',
  'geoPoints',
  'scatterPoints',
  'waterfallSteps',
  'distribution',
  'tableRows',
]);

/**
 * How many columns this card occupies.
 *
 * A lead card earns a bigger title and a taller chart. It earns the second column only
 * if its chart actually uses the width — a pair of gauges stretched across 1,500px is
 * not emphasis, it is a void.
 *
 * Decided from the catalogue alone, never from generated data, so a page can lay itself
 * out without generating 163 series first.
 */
export function cardSpan(insight: Insight): 1 | 2 {
  if (!insight.demoPath) return 1;
  const primary = insight.panels[0];
  const wide = WIDE_SHAPES.has(shapeFor(primary.component, primary.variant));
  return wide || insight.panels.length === 2 ? 2 : 1;
}

export function isLead(insight: Insight): boolean {
  return insight.demoPath;
}

/**
 * Chunk a section's insights into rows.
 *
 * A two-column card placed into a half-filled CSS grid row cannot fit, so the browser
 * starts a new row and leaves a hole — several hundred pixels of nothing mid-page.
 * `grid-auto-flow: dense` would backfill it, but only by reordering, and PRD §11.2
 * requires workbook order within a section. Chunking keeps the order and closes the gaps.
 */
export function toRows(insights: readonly Insight[]): readonly (readonly Insight[])[] {
  const rows: Insight[][] = [];
  let pair: Insight[] = [];

  for (const insight of insights) {
    if (cardSpan(insight) === 2) {
      if (pair.length > 0) {
        rows.push(pair);
        pair = [];
      }
      rows.push([insight]);
      continue;
    }
    pair.push(insight);
    if (pair.length === 2) {
      rows.push(pair);
      pair = [];
    }
  }
  if (pair.length > 0) rows.push(pair);
  return rows;
}
