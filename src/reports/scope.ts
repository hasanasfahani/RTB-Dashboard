/**
 * Resolving a block's scope, and deciding what it is allowed to see.
 *
 * Two separate steps, in this order:
 *
 *   1. `resolveScope` — the reader's per-block override **replaces** the header, per
 *      dimension (I7). A block scoped to Basra means Basra, not "Basra as well as".
 *   2. `scopeForBlock` — some blocks compare *across* a dimension, and must never be
 *      handed a view filtered on it (I6). Decided here, outside the block, because a
 *      block that declares "I compare branches" and then reads the filtered view anyway
 *      fails silently until someone scopes a report to one branch and sees a map with a
 *      single circle on it.
 */

import type { Filters, Insight } from '../types.ts';
import { shapeFor } from '../types.ts';
import { dimensionFor } from '../data/dimensions.ts';
import { branches } from '../data/entities.ts';
import { DIVISIONS_LABEL, PERIOD_LABEL } from '../data/filters.ts';
import type { BlockScope } from './model.ts';

/** The reader's override replaces the header, dimension by dimension (I7). */
export function resolveScope(base: Filters, scope?: BlockScope): Filters {
  if (!scope) return base;
  const next: Filters = {
    period: scope.period ?? base.period,
    branch: scope.branch ?? base.branch,
    division: scope.division ?? base.division,
    currency: scope.currency ?? base.currency,
  };
  return next;
}

// ---------------------------------------------------------------------------
// Exemptions — I6
// ---------------------------------------------------------------------------

export interface BlockExemptions {
  /** The block compares branches; a branch filter would collapse it. */
  readonly branch: boolean;
  /** The block compares divisions; a division filter would make it 100% one division. */
  readonly division: boolean;
}

/**
 * Blocks that describe the *whole* customer or depositor base by definition.
 *
 * "The top 1% of customers hold 34% of deposits" is a statement about the bank. Scoped
 * to one branch it silently becomes a statement about that branch while still reading as
 * the headline figure the demo script quotes.
 *
 * The test needs the *base* named, not merely the word "concentration". Matching that
 * word alone swept in "Sector / industry concentration", which is a question about
 * sectors — and sector concentration inside Basra is a perfectly good thing to ask. An
 * over-broad exemption is not a safe default: it answers a branch question with a
 * bank-wide figure and puts a chip on it saying the branch did not apply.
 */
function comparesWholeBase(insight: Insight): boolean {
  const haystack = `${insight.title} ${insight.vizLabel}`;
  const namesTheBase = /depositor|customer|client|borrower|whole bank|whole book|whole network/i.test(haystack);
  const isConcentration = /concentration|lorenz|herfindahl|top[- ]?\d+/i.test(haystack);
  return namesTheBase && isConcentration;
}

/**
 * What this block must not be filtered on.
 *
 * Derived from the catalogue rather than hand-listed, so a block added later is covered
 * without anyone remembering to update a list.
 */
export function exemptionsFor(insight: Insight): BlockExemptions {
  const primary = insight.panels[0];
  const shape = shapeFor(primary.component, primary.variant);
  const dimension = dimensionFor(insight);

  const comparesBranches =
    shape === 'geoPoints' ||
    dimension.id === 'branch' ||
    insight.panels.some((panel) => panel.component === 'GeoMap') ||
    comparesWholeBase(insight);

  const comparesDivisions = dimension.id === 'division';

  return { branch: comparesBranches, division: comparesDivisions };
}

/**
 * The view a block is actually rendered with.
 *
 * Outlet dimensions still apply — a concentration question asked of USD deposits is
 * still a USD question — so only the dimension the block compares is stripped.
 */
export function scopeForBlock(insight: Insight, filters: Filters): Filters {
  const exempt = exemptionsFor(insight);
  if (!exempt.branch && !exempt.division) return filters;
  return {
    ...filters,
    ...(exempt.branch ? { branch: 'all' as const } : {}),
    ...(exempt.division ? { division: 'all' as const } : {}),
  };
}

/**
 * The whole pipeline, in the one order that is correct:
 * override the header, then strip what the block compares across.
 */
export function viewForBlock(insight: Insight, header: Filters, scope?: BlockScope): Filters {
  return scopeForBlock(insight, resolveScope(header, scope));
}

// ---------------------------------------------------------------------------
// Chips — I3
// ---------------------------------------------------------------------------

export interface ScopeChip {
  readonly key: keyof Filters;
  readonly label: string;
  /**
   * True when the reader set this dimension but the block ignores it. The chip must not
   * claim a filter applied when it did not; the card appends a sentence saying so.
   */
  readonly ignored: boolean;
}

/* Labels come from `filters.ts`; a second copy here would drift the moment one changed. */

/**
 * A block whose slice differs from the header states it on its own face (I3), in the
 * reader's words — branch and division **names**, not ids.
 *
 * Every dimension where the block's **effective view** differs from the header earns a
 * chip, and there are two ways that happens:
 *
 *   - the reader **overrode** it for this block — a solid chip naming the block's slice;
 *   - the block **ignores** it, because it compares across that dimension (I6) — a struck
 *     chip naming the header's selection, plus a sentence in the footnote.
 *
 * The second case is the one that was missing, and it is the more dangerous of the two. A
 * report header reading "Basra" over a deposit-concentration block that is exempt from the
 * branch filter shows a whole-bank figure under a branch heading, with nothing anywhere on
 * the card admitting it. Describing the *view* rather than the reader's override catches
 * both, because the question a chip answers is "is this panel reading what the header
 * says", and the override is only one of the reasons the answer can be no.
 */
export function describeScope(
  insight: Insight,
  header: Filters,
  scope?: BlockScope,
): readonly ScopeChip[] {
  const exempt = exemptionsFor(insight);
  // What the reader asked this block for, from either source, before I6 strips anything.
  const asked = resolveScope(header, scope);
  const chips: ScopeChip[] = [];

  if (asked.period !== header.period) {
    chips.push({ key: 'period', label: PERIOD_LABEL[asked.period], ignored: false });
  }

  /*
   * An exempt dimension is reported against what was *asked*, not against the header.
   * Both routes reach the same wrong impression — a reader can set Basra on the page or on
   * this one block — and in both cases the panel draws all eleven branches. The chip names
   * the value that was asked for and strikes it through, because that is the value the
   * reader believes they are looking at.
   */
  if (exempt.branch) {
    if (asked.branch !== 'all') {
      chips.push({ key: 'branch', label: branchName(asked.branch), ignored: true });
    }
  } else if (asked.branch !== header.branch) {
    chips.push({ key: 'branch', label: branchName(asked.branch), ignored: false });
  }

  if (exempt.division) {
    if (asked.division !== 'all') {
      chips.push({ key: 'division', label: divisionName(asked.division), ignored: true });
    }
  } else if (asked.division !== header.division) {
    chips.push({ key: 'division', label: divisionName(asked.division), ignored: false });
  }

  if (asked.currency !== header.currency) {
    chips.push({ key: 'currency', label: currencyName(asked.currency), ignored: false });
  }

  return chips;
}

function branchName(branch: Filters['branch']): string {
  if (branch === 'all') return 'All branches';
  return branches.find((candidate) => candidate.id === branch)?.name ?? branch;
}

function divisionName(division: Filters['division']): string {
  return division === 'all' ? 'All divisions' : DIVISIONS_LABEL[division];
}

function currencyName(currency: Filters['currency']): string {
  if (currency === 'all') return 'All currencies';
  return currency === 'OTHER' ? 'Other currencies' : currency;
}

/** The sentence appended to a block's footnote when part of its scope does not apply. */
export function ignoredScopeNote(chips: readonly ScopeChip[]): string | undefined {
  const ignored = chips.filter((chip) => chip.ignored);
  if (ignored.length === 0) return undefined;
  const dimensions = ignored.map((chip) => chip.key).join(' and ');
  return `This block compares across ${dimensions}, so the ${dimensions} selection above does not apply to it.`;
}
