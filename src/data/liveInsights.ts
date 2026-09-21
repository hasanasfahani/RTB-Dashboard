/**
 * The live provider — the only file in `src/` that makes a network call.
 *
 * It is unreachable unless the build was run with `VITE_INSIGHTS_PROVIDER=live`. Vite
 * substitutes that expression with a literal, so in the default build the dynamic import
 * in `insightProvider.ts` is inside a statically false branch and this module is not in
 * the bundle at all. That is what keeps PRD §17's "runs fully offline" true rather than
 * merely intended — and it is why `verify:tokens` allows the call here and nowhere else.
 *
 * The prompt states the same rules the local generator enforces in code. Anything that
 * comes back is treated as untrusted: it is validated against the caps and the shape, and
 * a response that does not conform is rejected so the caller falls back to `local`.
 */

import type { Filters, Insight } from '../types.ts';
import { panelsFor } from './seriesFor.ts';
import { describeFilters } from './filters.ts';
import {
  caps,
  type Action,
  type Confidence,
  type Finding,
  type GeneratedInsight,
  type Verdict,
} from './generatedInsight.ts';
import type { InsightRun } from './insightProvider.ts';

const ENDPOINT = import.meta.env.VITE_INSIGHTS_ENDPOINT ?? '';
const TIMEOUT_MS = 8000;

const VERDICTS: readonly Verdict[] = ['positive', 'watch', 'negative', 'neutral'];
const CONFIDENCES: readonly Confidence[] = ['high', 'medium', 'low'];
const HORIZONS = ['now', 'this month', 'this quarter'] as const;

/** The rules, stated rather than hoped for. The caps are the same numbers the gate checks. */
function promptFor(insight: Insight, filters: Filters): string {
  const panels = panelsFor(insight.id, filters);
  return [
    'You are reading one panel of a bank BI dashboard and writing what follows from it.',
    `Insight ${insight.id}: ${insight.title}. Section: ${insight.domain}. Unit: ${insight.unit}.`,
    `Slice on screen: ${describeFilters(filters)}.`,
    'Rules:',
    `- headline: at most ${caps.HEADLINE_MAX_WORDS} words, the single takeaway.`,
    `- findings: two or three, each at most ${caps.FINDING_MAX_WORDS} words, each with an "evidence" string carrying a figure taken from the data below. A claim with no figure must be dropped, not padded.`,
    '- soWhat: one sentence, the business consequence.',
    '- actions: one to three, imperative, verb first, each with a horizon of "now", "this month" or "this quarter" and an owner.',
    '- Never describe how to read the chart. The reader can see it.',
    '- Rank rather than enumerate: drop the weakest finding rather than filling three slots.',
    'Reply with JSON only, matching: { headline, verdict, findings: [{text, evidence}], soWhat, actions: [{text, horizon, owner}], watchNext, confidence, caveat }',
    `Data: ${JSON.stringify(panels)}`,
  ].join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * Validate rather than trust.
 *
 * A model that writes a fourteen-word headline or a finding with no figure has broken the
 * contract this panel's layout and gate are built on, and the honest response is to fall
 * back to a reading that keeps it.
 */
function parse(payload: unknown, filters: Filters): GeneratedInsight | undefined {
  if (!isRecord(payload)) return undefined;

  const headline = str(payload.headline);
  const soWhat = str(payload.soWhat);
  const verdict = VERDICTS.find((v) => v === payload.verdict);
  const confidence = CONFIDENCES.find((c) => c === payload.confidence) ?? 'medium';
  if (!headline || !soWhat || !verdict) return undefined;
  if (caps.words(headline) > caps.HEADLINE_MAX_WORDS) return undefined;

  const findings: Finding[] = [];
  for (const raw of Array.isArray(payload.findings) ? payload.findings : []) {
    if (!isRecord(raw)) continue;
    const text = str(raw.text);
    const evidence = str(raw.evidence);
    if (!text || !evidence) continue;
    if (caps.words(text) > caps.FINDING_MAX_WORDS) continue;
    if (!/\d/.test(evidence)) continue;
    findings.push({ text, evidence });
  }
  if (findings.length === 0) return undefined;

  const actions: Action[] = [];
  for (const raw of Array.isArray(payload.actions) ? payload.actions : []) {
    if (!isRecord(raw)) continue;
    const text = str(raw.text);
    const owner = str(raw.owner);
    const horizon = HORIZONS.find((h) => h === raw.horizon);
    if (!text || !horizon) continue;
    actions.push({ text, horizon, owner: owner ?? 'Unassigned' });
  }
  if (actions.length === 0) return undefined;

  const watchNext = str(payload.watchNext);
  const caveat = confidence === 'high' ? undefined : str(payload.caveat);

  return {
    headline,
    verdict,
    findings: findings.slice(0, 3),
    soWhat,
    actions: actions.slice(0, 3),
    ...(watchNext ? { watchNext } : {}),
    confidence,
    ...(caveat ? { caveat } : {}),
    scope: describeFilters(filters),
  };
}

/**
 * Rejects on anything at all — a bad status, a malformed body, a timeout — so the caller's
 * catch falls back to `local`. The abort signal is the panel's, passed straight through,
 * so a filter change cancels the request rather than letting a superseded answer land.
 */
export async function runLive(
  insight: Insight,
  filters: Filters,
  signal: AbortSignal,
): Promise<InsightRun> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS);
  const onAbort = (): void => timeout.abort();
  signal.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: promptFor(insight, filters) }),
      signal: timeout.signal,
    });
    if (!response.ok) throw new Error(`insights endpoint returned ${response.status}`);
    const parsed = parse(await response.json(), filters);
    if (!parsed) throw new Error('insights endpoint returned a response that broke the contract');
    return { insight: parsed, source: 'live' };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}
