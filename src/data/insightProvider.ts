/**
 * Where a reading comes from, and the one interface the panel talks to.
 *
 * PRD §17 requires this build to run with no network at all, and §16 requires it to
 * survive a dead conference-room network. A live model call satisfies neither, so the
 * default provider is `local`: deterministic, offline, and built on the same
 * `seriesFor` call the chart drew from.
 *
 * `live` exists for the case where a real model is wanted, and is reached only when
 * `VITE_INSIGHTS_PROVIDER` is set to `live` at build time. Vite replaces that expression
 * with a literal, so with the variable unset the branch below is statically false and the
 * adapter — and its network call — is **eliminated from the bundle entirely**. The demo
 * does not ship a fetch it merely promises not to make.
 *
 * Both paths resolve to the same `InsightRun`, so nothing downstream branches on provider.
 */

import type { Filters, Insight } from '../types.ts';
import { generateInsight, type GeneratedInsight } from './generatedInsight.ts';
import { panelsFor } from './seriesFor.ts';

export type ProviderName = 'local' | 'live';

export interface InsightRun {
  readonly insight: GeneratedInsight;
  readonly source: ProviderName;
  /** Set only when the run did not come from where it was supposed to. One line, shown. */
  readonly note?: string;
}

/**
 * The stages the progress bar names.
 *
 * They are the work, in order, not decoration: the local generator really does read the
 * series, then compare it against whatever reference the panel carries, then compose.
 */
export const STAGES: readonly string[] = [
  'Reading the series',
  'Comparing against plan',
  'Drafting the reading',
];

/**
 * How long the local path takes, deliberately.
 *
 * The arithmetic is sub-millisecond. A reading that appeared instantly would read as
 * canned — which it partly is — and, more practically, the panel would flash rather than
 * fill. 900ms is long enough to watch the bar cross and short enough not to wait on.
 */
export const LOCAL_MS = 900;

/** Live only when the build was told so. A literal at build time, so the check is free. */
export function providerName(): ProviderName {
  const configured =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_INSIGHTS_PROVIDER
      : undefined;
  return configured === 'live' ? 'live' : 'local';
}

class Aborted extends Error {
  constructor() {
    super('aborted');
    this.name = 'AbortError';
  }
}

export function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** A delay that gives up when the run is superseded, rather than resolving into a void. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Aborted());
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort(): void {
      clearTimeout(timer);
      reject(new Aborted());
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/** The offline path. Pure arithmetic, paced so the panel has something to show. */
async function runLocal(insight: Insight, filters: Filters, signal: AbortSignal): Promise<InsightRun> {
  const result = generateInsight(insight, panelsFor(insight.id, filters), filters);
  await wait(LOCAL_MS, signal);
  return { insight: result, source: 'local' };
}

/**
 * A reading for one insight under one filter selection.
 *
 * Rejects with an `AbortError` when superseded — a filter change while a run is in flight
 * — and the caller discards it. It never rejects for any other reason: a live provider
 * that fails falls back to `local` and says so in one line, because a demo must never be
 * left holding a loader that does not end.
 */
export async function runInsight(
  insight: Insight,
  filters: Filters,
  signal: AbortSignal,
): Promise<InsightRun> {
  if (providerName() === 'live') {
    try {
      const { runLive } = await import('./liveInsights.ts');
      return await runLive(insight, filters, signal);
    } catch (error) {
      if (isAbort(error)) throw error;
      const local = await runLocal(insight, filters, signal);
      return {
        ...local,
        note: 'The model could not be reached, so this reading was generated on the device.',
      };
    }
  }
  return runLocal(insight, filters, signal);
}
