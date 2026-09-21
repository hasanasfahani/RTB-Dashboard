/**
 * The block catalogue — a registry view over the 163 insights.
 *
 * Derived, not hand-written. The supplied spec warns that building its registry "looks
 * small and is not", because each of its 21 blocks had to be lifted out of the page it
 * lived on and rewritten as a pure function. Here that work is already done: an insight
 * is already a named finding with its own data builder, chart, lead line and footnote,
 * and `seriesFor` is already the pure `(view) => data` the registry needs. So this file
 * describes the blocks rather than implementing them.
 *
 * Nothing here renders. A `BlockDef` is what the **picker** needs to list a block and
 * what the **card** needs to label one; drawing it is `InsightPanel`'s job, exactly as
 * on every other page.
 */

import {
  shapeFor,
  type ChartComponent,
  type ChartShape,
  type Insight,
  type Layer,
  type Refresh,
} from '../types.ts';
import { insights, sectionOf, tryById } from '../data/insights.ts';
import { cardSpan } from '../components/insight/layout.ts';
import { exemptionsFor, type BlockExemptions } from './scope.ts';

export interface BlockDef {
  /** Insight id — the key a report stores. */
  readonly id: string;
  readonly label: string;
  /** One line, shown under the label in the picker. */
  readonly description: string;
  readonly layer: Layer;
  readonly layerLabel: string;
  readonly section: string;
  readonly sectionSlug: string;
  /**
   * Drives the picker's schematic thumbnail.
   *
   * Deliberately the data shape, not the chart component's name: a reader scanning the
   * list asks "what will this look like on my page", and a small schematic answers that
   * instantly where a real preview would cost a full data build per row.
   */
  readonly shape: ChartShape;
  readonly components: readonly ChartComponent[];
  /** The grid packs by this; the reader never places a block (I5). */
  readonly width: 'half' | 'full';
  readonly demoPath: boolean;
  readonly refresh: Refresh;
  /** The block's own caveat, carried from its home page. */
  readonly method: string;
  readonly vizLabel: string;
  /** Which dimensions this block compares across, and so must not be filtered on (I6). */
  readonly exempt: BlockExemptions;
  /** Pre-lowered haystack for the picker's search. */
  readonly search: string;
}

function toBlock(insight: Insight): BlockDef {
  const section = sectionOf(insight);
  const primary = insight.panels[0];
  return {
    id: insight.id,
    label: insight.title,
    description: insight.whatItTells,
    layer: insight.layer,
    layerLabel: insight.layerLabel,
    section: section.label,
    sectionSlug: section.slug,
    shape: shapeFor(primary.component, primary.variant),
    components: insight.panels.map((panel) => panel.component),
    width: cardSpan(insight) === 2 ? 'full' : 'half',
    demoPath: insight.demoPath,
    refresh: insight.refresh,
    method: insight.method,
    vizLabel: insight.vizLabel,
    exempt: exemptionsFor(insight),
    search: `${insight.id} ${insight.title} ${insight.whatItTells} ${section.label} ${insight.vizLabel}`.toLowerCase(),
  };
}

/** Every block, in workbook order. */
export const BLOCKS: readonly BlockDef[] = insights.map(toBlock);

const BY_ID = new Map(BLOCKS.map((block) => [block.id, block]));

/**
 * `undefined` for an id this build does not know.
 *
 * An old share link can name a block that no longer exists. The card renders a panel
 * saying so and naming the id, rather than leaving a gap the reader has to guess at.
 */
export function tryBlockDef(id: string): BlockDef | undefined {
  return BY_ID.get(id);
}

export function blockDef(id: string): BlockDef {
  const block = BY_ID.get(id);
  if (!block) throw new Error(`Unknown block "${id}"`);
  return block;
}

export function isKnownBlock(id: string): boolean {
  return BY_ID.has(id) && tryById(id) !== undefined;
}

// ---------------------------------------------------------------------------
// Grouping for the picker
// ---------------------------------------------------------------------------

export interface BlockGroup {
  readonly key: Layer;
  readonly label: string;
  readonly blocks: readonly BlockDef[];
}

/**
 * Grouped by **layer**, four groups, with each row naming its own section.
 *
 * The supplied spec groups its 21 blocks into eight. Thirty groups for 163 blocks would
 * be a directory rather than a menu, so the section moves onto the row and search does
 * the narrowing.
 */
export function blockGroups(list: readonly BlockDef[] = BLOCKS): readonly BlockGroup[] {
  const order: Layer[] = ['executive', 'bank-wide', 'retail', 'corporate'];
  return order
    .map((key) => ({
      key,
      label: list.find((block) => block.layer === key)?.layerLabel ?? key,
      blocks: list.filter((block) => block.layer === key),
    }))
    .filter((group) => group.blocks.length > 0);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Lower is better: an exact id, then an id prefix, then a title prefix, then anywhere. */
function score(block: BlockDef, query: string): number | undefined {
  const id = block.id.toLowerCase();
  const label = block.label.toLowerCase();

  if (id === query) return 0;
  if (id.startsWith(query)) return 1;
  if (label.startsWith(query)) return 2;

  const inLabel = label.indexOf(query);
  if (inLabel >= 0) return 3 + inLabel / 1000;
  if (block.section.toLowerCase().includes(query)) return 5;
  if (block.search.includes(query)) return 6;
  return undefined;
}

/** Filters on label, description, section and visualization — case-insensitive. */
export function searchBlocks(query: string, list: readonly BlockDef[] = BLOCKS): readonly BlockDef[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return list;
  return list
    .flatMap((block) => {
      const value = score(block, trimmed);
      return value === undefined ? [] : [{ block, value }];
    })
    .sort((a, b) => a.value - b.value)
    .map((entry) => entry.block);
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

/**
 * "You use these" — drawn from the reader's **own reports**, most used first.
 *
 * Not a separate recently-used list, which would eventually disagree with the reports
 * themselves.
 */
export function suggestedBlocks(
  usage: ReadonlyMap<string, number>,
  limit = 4,
): readonly BlockDef[] {
  return [...usage.entries()]
    .filter(([id]) => BY_ID.has(id))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => blockDef(id));
}

/**
 * The one-click starters offered on an empty report.
 *
 * Four different shapes on purpose — a KPI row, a pair of dials, a balance-sheet bridge
 * and the concentration curve the demo is built around. An empty page with a single
 * button teaches nothing about what a report can contain, and four rows that all look
 * alike teach almost as little: the branch-network block that stood here first is drawn
 * as a ranked bar, which is what the concentration block already is.
 */
export const STARTER_BLOCK_IDS: readonly string[] = ['E-01', 'E-02', 'G-12', 'R-17'];

export function starterBlocks(): readonly BlockDef[] {
  return STARTER_BLOCK_IDS.map((id) => blockDef(id));
}
