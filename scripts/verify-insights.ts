/**
 * Phase 10 gate — every one of the 163 produces a well-formed reading.
 *
 *   npm run verify:insights
 *
 * The exit criterion in the plan is "proven by a gate, not by clicking", and the caps the
 * types promise are only promises until something checks them. A label comes out of the
 * dimension tables, so a headline that fits on one insight can run long on another; that
 * is exactly the class of defect a person walking the demo would never find.
 */

import { catalogue } from '../src/data/insights.ts';
import { panelsFor } from '../src/data/seriesFor.ts';
import {
  caps,
  generateInsight,
  type GeneratedInsight,
} from '../src/data/generatedInsight.ts';
import { THEME_BY_SECTION, sectionKey } from '../src/data/insightThemes.ts';
import { DEFAULT_FILTERS } from '../src/data/filters.ts';
import type { Filters } from '../src/types.ts';

let failures = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

function heading(title: string): void {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

const insights = catalogue.insights;

/**
 * Four selections, not one.
 *
 * The default is the demo path; a branch-and-division cut is the one a CEO reaches for;
 * `30D` is the selection that puts 85 of the 163 on the two-point floor and attaches the
 * span caveat (plan §2.26), which is where the confidence and caveat rules are exercised.
 */
const SELECTIONS: readonly { label: string; filters: Filters }[] = [
  { label: 'default', filters: DEFAULT_FILTERS },
  { label: 'Basra · Retail', filters: { ...DEFAULT_FILTERS, branch: 'basra', division: 'retail' } },
  { label: 'last 30 days', filters: { ...DEFAULT_FILTERS, period: '30D' } },
  { label: 'USD · 24M', filters: { ...DEFAULT_FILTERS, period: '24M', currency: 'USD' } },
];

// ---------------------------------------------------------------------------

heading('Themes — every section knows what it is about');

const unmapped = insights
  .map((i) => sectionKey(i.layer, i.group))
  .filter((key, index, all) => all.indexOf(key) === index)
  .filter((key) => !(key in THEME_BY_SECTION));
check('all 30 sections are mapped to a theme', unmapped.length === 0, unmapped.join(', '));

// ---------------------------------------------------------------------------

heading('Structure — all 163, under four selections');

/** No sentence may restate the chart guide, which the drawer under the card already does. */
const BANNED = [
  /this chart shows/i,
  /as (?:we|you) can see/i,
  /the chart above/i,
  /the graph/i,
  /it is (?:clear|evident) that/i,
];

const problems: string[] = [];
let generated = 0;
const digits = /\d/;

function inspect(id: string, selection: string, result: GeneratedInsight): void {
  const where = `${id} @ ${selection}`;

  if (caps.words(result.headline) > caps.HEADLINE_MAX_WORDS) {
    problems.push(`${where}: headline ${caps.words(result.headline)} words — "${result.headline}"`);
  }
  if (result.findings.length === 0) problems.push(`${where}: no findings`);
  if (result.findings.length > 3) problems.push(`${where}: ${result.findings.length} findings`);

  for (const finding of result.findings) {
    if (caps.words(finding.text) > caps.FINDING_MAX_WORDS) {
      problems.push(`${where}: finding ${caps.words(finding.text)} words — "${finding.text}"`);
    }
    if (finding.evidence.trim() === '') problems.push(`${where}: finding with no evidence`);
    // The rule that stops a claim floating free: evidence carries a figure.
    if (!digits.test(finding.evidence)) {
      problems.push(`${where}: evidence carries no figure — "${finding.evidence}"`);
    }
  }

  if (result.actions.length === 0) problems.push(`${where}: no action`);
  if (result.actions.length > 3) problems.push(`${where}: ${result.actions.length} actions`);
  for (const action of result.actions) {
    if (action.text.trim() === '') problems.push(`${where}: empty action`);
    if (action.owner.trim() === '') problems.push(`${where}: action with no owner`);
  }

  if (result.soWhat.trim() === '') problems.push(`${where}: no soWhat`);
  if (!result.soWhat.trim().endsWith('.')) problems.push(`${where}: soWhat is not a sentence`);
  if (result.soWhat.split('. ').length > 1) problems.push(`${where}: soWhat is more than one sentence`);

  if (result.caveat !== undefined && result.confidence === 'high') {
    problems.push(`${where}: caveat on a high-confidence reading`);
  }
  if (result.scope.trim() === '') problems.push(`${where}: no scope stated`);

  const prose = [
    result.headline,
    result.soWhat,
    result.watchNext ?? '',
    ...result.findings.map((f) => `${f.text} ${f.evidence}`),
    ...result.actions.map((a) => a.text),
  ].join(' ');
  for (const pattern of BANNED) {
    if (pattern.test(prose)) problems.push(`${where}: restates the chart — ${pattern}`);
  }
}

for (const selection of SELECTIONS) {
  for (const insight of insights) {
    try {
      const panels = panelsFor(insight.id, selection.filters);
      const result = generateInsight(insight, panels, selection.filters);
      generated += 1;
      inspect(insight.id, selection.label, result);
    } catch (error) {
      problems.push(`${insight.id} @ ${selection.label}: threw — ${(error as Error).message}`);
    }
  }
}

check(
  `${generated} readings generated across ${SELECTIONS.length} selections, all well formed`,
  problems.length === 0,
  problems.slice(0, 8).join(' | '),
);
if (problems.length > 8) console.log(`        ...and ${problems.length - 8} more`);

// ---------------------------------------------------------------------------

heading('A4 — the same selection reproduces the same reading');

const repeats = insights.slice(0, 40).filter((insight) => {
  const once = JSON.stringify(
    generateInsight(insight, panelsFor(insight.id, DEFAULT_FILTERS), DEFAULT_FILTERS),
  );
  const twice = JSON.stringify(
    generateInsight(insight, panelsFor(insight.id, DEFAULT_FILTERS), DEFAULT_FILTERS),
  );
  return once !== twice;
});
check('generating twice produces the same reading', repeats.length === 0, repeats.map((i) => i.id).join(', '));

/** A filter change must reach the words, or the panel would be describing the wrong slice. */
const inert = insights.slice(0, 40).filter((insight) => {
  const base = generateInsight(insight, panelsFor(insight.id, DEFAULT_FILTERS), DEFAULT_FILTERS);
  const cut: Filters = { ...DEFAULT_FILTERS, branch: 'basra', division: 'retail' };
  const other = generateInsight(insight, panelsFor(insight.id, cut), cut);
  return base.scope === other.scope;
});
check('a filter change changes the stated scope', inert.length === 0, inert.map((i) => i.id).join(', '));

// ---------------------------------------------------------------------------

heading('Summary');
console.log(`  ${insights.length} insights × ${SELECTIONS.length} selections = ${generated} readings`);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.\n`);
  process.exit(1);
}
console.log('\nAll checks passed.\n');
