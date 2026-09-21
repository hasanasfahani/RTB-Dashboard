/**
 * The custom-report data model, and every operation on it.
 *
 * All pure. A report holds **block references only** — never figures, never a scope of
 * its own (I1, I2). Everything recomputes from `seriesFor`, so a report built today and
 * opened next month describes next month rather than being a screenshot.
 *
 * The unit is a whole **insight**, not a panel: an insight is the named finding, and 73
 * of the 163 carry two panels that belong together.
 */

import type { Filters } from '../types.ts';

/**
 * The dimensions a block may override — all four, including `period`.
 *
 * A report comparing this quarter against last is the one override that cannot be
 * expressed any other way, so period has to be in here.
 */
export type BlockScope = Partial<Filters>;

export interface ReportBlock {
  /** Instance id. The same insight may appear twice at different scopes. */
  readonly id: string;
  /** Insight id — `R-17`, `E-02`. */
  readonly blockId: string;
  /** **Absent** means "inherit the header". Never stored as `{}` or `undefined`. */
  readonly scope?: BlockScope;
  /** The reader's own words. Absent means the insight's own title. */
  readonly title?: string;
}

export interface CustomReport {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  /** The rail and the index order by this. */
  readonly updatedAt: string;
  readonly blocks: readonly ReportBlock[];
}

export const DEFAULT_REPORT_NAME = 'My Report';

// ---------------------------------------------------------------------------
// Ids and timestamps
// ---------------------------------------------------------------------------

let counter = 0;

/**
 * `prefix + base36 time + base36 counter`.
 *
 * Not a UUID: `crypto.randomUUID` is not available everywhere this has to run, a report
 * id carries no security meaning, and this has to survive a trip through a URL. Also not
 * random — PRD §16 bans `Math.random` outright, and the counter makes it unnecessary.
 */
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`;
}

/**
 * An ISO timestamp guaranteed to be strictly later than the one before it.
 *
 * `byRecency` sorts on `updatedAt`, and two edits inside the same millisecond would
 * otherwise tie and order arbitrarily — trivial to hit when a reader adds four blocks in
 * quick succession, and certain to happen in a test.
 */
let lastStamp = 0;

export function stamp(): string {
  const now = Date.now();
  lastStamp = now > lastStamp ? now : lastStamp + 1;
  return new Date(lastStamp).toISOString();
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export function createReport(name?: string): CustomReport {
  const at = stamp();
  return {
    id: makeId('r'),
    name: normaliseName(name),
    createdAt: at,
    updatedAt: at,
    blocks: [],
  };
}

export function makeBlock(blockId: string, scope?: BlockScope): ReportBlock {
  const cleaned = cleanScope(scope);
  return {
    id: makeId('b'),
    blockId,
    // Omitted, not set to undefined — `'scope' in block` is the test for "differs from
    // the header", and an explicit undefined answers yes.
    ...(cleaned ? { scope: cleaned } : {}),
  };
}

function normaliseName(name?: string): string {
  const trimmed = (name ?? '').trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_REPORT_NAME;
}

/** Strips undefined values, and returns `undefined` for an empty result. Never `{}`. */
export function cleanScope(scope?: BlockScope): BlockScope | undefined {
  if (!scope) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(scope)) {
    if (value !== undefined) out[key] = value;
  }
  return Object.keys(out).length > 0 ? (out as BlockScope) : undefined;
}

/** Does this block differ from the header at all? */
export function hasScope(scope?: BlockScope): boolean {
  return cleanScope(scope) !== undefined;
}

export function blockHasScope(block: ReportBlock): boolean {
  return 'scope' in block && hasScope(block.scope);
}

// ---------------------------------------------------------------------------
// Editing — every one returns a new report and stamps `updatedAt`
// ---------------------------------------------------------------------------

function touch(report: CustomReport, blocks: readonly ReportBlock[]): CustomReport {
  return { ...report, blocks, updatedAt: stamp() };
}

export function renameReport(report: CustomReport, name: string): CustomReport {
  return { ...report, name: normaliseName(name), updatedAt: stamp() };
}

export function addBlock(report: CustomReport, blockId: string, scope?: BlockScope): CustomReport {
  return touch(report, [...report.blocks, makeBlock(blockId, scope)]);
}

export function removeBlock(report: CustomReport, instanceId: string): CustomReport {
  const blocks = report.blocks.filter((block) => block.id !== instanceId);
  return blocks.length === report.blocks.length ? report : touch(report, blocks);
}

/**
 * Inserted **beside** its original, carrying title and scope.
 *
 * A duplicate is almost always the first half of "and now change this one's scope", so
 * putting the copy at the end would mean an immediate drag.
 */
export function duplicateBlock(report: CustomReport, instanceId: string): CustomReport {
  const index = report.blocks.findIndex((block) => block.id === instanceId);
  const original = report.blocks[index];
  if (!original) return report;

  const copy: ReportBlock = {
    ...original,
    id: makeId('b'),
  };
  const blocks = [...report.blocks];
  blocks.splice(index + 1, 0, copy);
  return touch(report, blocks);
}

/** Index is clamped; a move that changes nothing returns the same report. */
export function moveBlock(report: CustomReport, instanceId: string, to: number): CustomReport {
  const from = report.blocks.findIndex((block) => block.id === instanceId);
  if (from < 0) return report;

  const target = Math.max(0, Math.min(to, report.blocks.length - 1));
  if (target === from) return report;

  const blocks = [...report.blocks];
  const [moved] = blocks.splice(from, 1);
  if (!moved) return report;
  blocks.splice(target, 0, moved);
  return touch(report, blocks);
}

/** An empty scope **deletes** the key rather than storing `{}` or `undefined`. */
export function setBlockScope(
  report: CustomReport,
  instanceId: string,
  scope?: BlockScope,
): CustomReport {
  let changed = false;
  const cleaned = cleanScope(scope);

  const blocks = report.blocks.map((block) => {
    if (block.id !== instanceId) return block;
    changed = true;
    const { scope: _dropped, ...rest } = block;
    return cleaned ? { ...rest, scope: cleaned } : rest;
  });

  return changed ? touch(report, blocks) : report;
}

/** Trimmed. An empty title **deletes** the key, restoring the insight's own title. */
export function setBlockTitle(
  report: CustomReport,
  instanceId: string,
  title?: string,
): CustomReport {
  let changed = false;
  const trimmed = (title ?? '').trim();

  const blocks = report.blocks.map((block) => {
    if (block.id !== instanceId) return block;
    changed = true;
    const { title: _dropped, ...rest } = block;
    return trimmed.length > 0 ? { ...rest, title: trimmed } : rest;
  });

  return changed ? touch(report, blocks) : report;
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

/** Most recently edited first. */
export function byRecency(reports: readonly CustomReport[]): CustomReport[] {
  return [...reports].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Replaces a report with the same id, or appends it. */
export function upsertReport(
  reports: readonly CustomReport[],
  report: CustomReport,
): CustomReport[] {
  const index = reports.findIndex((existing) => existing.id === report.id);
  if (index < 0) return [...reports, report];
  const next = [...reports];
  next[index] = report;
  return next;
}

/** How many times an insight is used across a set of reports — drives "You use these". */
export function blockUsage(reports: readonly CustomReport[]): ReadonlyMap<string, number> {
  const usage = new Map<string, number>();
  for (const report of reports) {
    for (const block of report.blocks) {
      usage.set(block.blockId, (usage.get(block.blockId) ?? 0) + 1);
    }
  }
  return usage;
}
