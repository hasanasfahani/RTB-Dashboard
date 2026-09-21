/**
 * Phase 0 and Phase 3 static gates.
 *
 * Enforces the discipline rules that are only checkable by reading the source:
 * A1 (tokens are the only source of colour), PRD §4 (no network, no storage) and
 * PRD §9 (numbers are never formatted inline).
 *
 *   npm run verify:tokens
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokens } from '../src/design/tokens.ts';
import { CHART_REGISTRY } from '../src/components/charts/registry.tsx';
import { CALLOUT_IDS, HEADLINE_VALUES } from '../src/data/attention.ts';
import { bank } from '../src/data/bank.ts';
import { allPanels, byLayer, sectionsFor, tryById } from '../src/data/insights.ts';
import { LAYERS, VARIANTS_BY_COMPONENT, type ChartComponent } from '../src/types.ts';

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

// `.pathname` percent-encodes spaces; this project's path has one.
const ROOT = fileURLToPath(new URL('..', import.meta.url));

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|css)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const sourceFiles = walk(join(ROOT, 'src')).map((path) => ({
  path: relative(ROOT, path),
  text: readFileSync(path, 'utf8'),
}));

/** Strips block and line comments, so prose in a doc comment is never a violation. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const code = sourceFiles.map((file) => ({ ...file, body: stripComments(file.text) }));

// ---------------------------------------------------------------------------

heading('Contrast — every token that carries text clears WCAG AA');

/*
 * Added with the RT Bank type and colour pass, because this build shipped failing it.
 *
 * `cyan` (#00A5BD) on white is 2.95:1 and `muted` (#8494A8) was 3.10:1 — both below the
 * 4.5:1 AA floor for body text, and cyan below even the 3:1 floor for large text. Between
 * them they set every disclosure label, every link and 120 pieces of secondary text. The
 * bank's own site had already solved this: its fee tables set figures in a deeper teal than
 * the brand cyan, never in the cyan itself.
 *
 * So the rule is not "use the brand colour". It is **a colour that carries text must be
 * legible on the surfaces it is used on**, and a brand accent that is not is kept for fills
 * and rules, where it belongs.
 */
function relativeLuminance(hex: string): number {
  const channels = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((pair) => {
    const value = parseInt(pair, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

function contrast(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const AA_TEXT = 4.5;
/** Both surfaces text sits on. A colour must clear AA on each, not just on white. */
const SURFACES: readonly [string, string][] = [
  ['surface', tokens.color.surface],
  ['canvas', tokens.color.canvas],
];
/** Every token used as a text colour anywhere in the application. */
const TEXT_TOKENS = ['ink', 'navy', 'muted', 'accent', 'positiveInk', 'warningInk', 'negative'] as const;

const failures_: string[] = [];
for (const name of TEXT_TOKENS) {
  for (const [surfaceName, surfaceHex] of SURFACES) {
    const ratio = contrast(tokens.color[name], surfaceHex);
    if (ratio < AA_TEXT) failures_.push(`${name} on ${surfaceName} ${ratio.toFixed(2)}:1`);
  }
}
check('every text colour clears 4.5:1 on both surface and canvas', failures_.length === 0,
  failures_.join(', '));

/* A filled control's label has to pass too — that is text on the fill, not beside it. */
const FILLS = ['navy', 'accent', 'positiveInk', 'warningInk', 'negative'] as const;
const fillFailures = FILLS.filter(
  (name) => contrast(tokens.color.surface, tokens.color[name]) < AA_TEXT,
).map((name) => `${name} ${contrast(tokens.color.surface, tokens.color[name]).toFixed(2)}:1`);
check('white text clears 4.5:1 on every filled control', fillFailures.length === 0,
  fillFailures.join(', '));

/*
 * `cyan` is deliberately *not* in either list. It is the brand accent and keeps the brand's
 * exact value, used for chips, marks and the 2px active rule — never for text. This asserts
 * that separation rather than trusting it.
 */
check('the brand cyan is kept at its exact brand value', tokens.color.cyan === '#00A5BD');
/* And the status hues keep theirs, so no chart moves. */
check('the status fills keep their values',
  tokens.color.positive === '#2F8F5B' && tokens.color.warning === '#E2A33C');
const statusText = code.filter((file) => /text-(positive|warning)\b(?!Ink)/.test(file.body)).map((f) => f.path);
check('nothing sets text in a status fill colour', statusText.length === 0, statusText.join(', '));
const cyanText = code.filter((file) => /text-cyan\b/.test(file.body)).map((file) => file.path);
check('nothing sets text in the brand cyan', cyanText.length === 0, cyanText.join(', '));
const cyanLabel = code.filter((file) => /bg-cyan[^"'`]*text-(surface|white)/.test(file.body)).map((f) => f.path);
check('no label sits on a brand-cyan fill', cyanLabel.length === 0, cyanLabel.join(', '));

// ---------------------------------------------------------------------------

heading('A1 — tokens are the only source of colour');

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const hexOffenders = code
  .filter((file) => file.path !== 'src/design/tokens.ts')
  .flatMap((file) => {
    const matches = file.body.match(HEX) ?? [];
    return matches.map((match) => `${file.path}: ${match}`);
  });

check('no hardcoded hex outside tokens.ts', hexOffenders.length === 0, hexOffenders.join(', '));

const NAMED_COLOUR = /\b(?:color|backgroundColor|fill|stroke)\s*[:=]\s*['"](?:red|green|blue|black|white|orange|grey|gray|yellow)['"]/i;
const namedOffenders = code
  .filter((file) => NAMED_COLOUR.test(file.body))
  .map((file) => file.path);
check('no CSS named colours in components', namedOffenders.length === 0, namedOffenders.join(', '));

check(
  'tokens.space maps onto Tailwind\'s default 4px scale',
  JSON.stringify([...tokens.space]) === JSON.stringify([4, 8, 12, 16, 24, 32, 48]),
  JSON.stringify([...tokens.space]),
);
check('the series ramp starts navy then cyan (PRD §8)',
  tokens.series[0] === tokens.color.navy && tokens.series[1] === tokens.color.cyan);

// ---------------------------------------------------------------------------

heading('PRD §4 — offline, and no persisted state');

const EXTERNAL = /(?:https?:)?\/\/(?!localhost|127\.0\.0\.1)[a-z0-9-]+\.[a-z]/i;
const externalOffenders = code
  .filter((file) => EXTERNAL.test(file.body))
  .map((file) => file.path);
check(
  'no external URLs in source — the demo must run with no network',
  externalOffenders.length === 0,
  externalOffenders.join(', '),
);

const STORAGE = /\b(?:localStorage|sessionStorage|indexedDB)\b/;
const storageOffenders = code.filter((file) => STORAGE.test(file.body)).map((file) => file.path);
check('no localStorage, sessionStorage or IndexedDB', storageOffenders.length === 0, storageOffenders.join(', '));

/*
 * One file may call out, and only under a flag that removes it from the default build.
 *
 * The property PRD §4 and §17 actually require is that **the demo makes no network call**,
 * not that the token `fetch` never appears — the same correction §2.24 had to make to the
 * webfont rule, which banned a mechanism instead of the thing that mattered. The live
 * insights adapter is reached through a dynamic import inside
 * `import.meta.env.VITE_INSIGHTS_PROVIDER === 'live'`. Vite replaces that with a literal,
 * so with the variable unset the branch is statically false and the module is not in the
 * bundle at all.
 *
 * So the allowance is one path, and two further checks below keep it honest: the adapter
 * must be reached only by dynamic import, and nothing may import it statically.
 */
const FETCH_ALLOWED = new Set(['src/data/liveInsights.ts']);
const FETCH = /\b(?:fetch\s*\(|XMLHttpRequest|axios)\b/;
const fetchOffenders = code
  .filter((file) => !FETCH_ALLOWED.has(file.path))
  .filter((file) => FETCH.test(file.body))
  .map((file) => file.path);
check('no data fetching outside the flagged live adapter', fetchOffenders.length === 0, fetchOffenders.join(', '));

const liveImporters = code
  .filter((file) => file.path !== 'src/data/liveInsights.ts')
  .filter((file) => /^\s*import\s[^\n]*liveInsights/m.test(file.body))
  .map((file) => file.path);
check(
  'nothing imports the live adapter statically, so it stays out of the default bundle',
  liveImporters.length === 0,
  liveImporters.join(', '),
);

const provider = code.find((file) => file.path.endsWith('data/insightProvider.ts'));
check(
  'the live adapter is reached only behind the build-time provider flag',
  provider !== undefined &&
    /providerName\(\) === 'live'/.test(provider.body) &&
    /await import\('\.\/liveInsights\.ts'\)/.test(provider.body),
);

const randomOffenders = code.filter((file) => /Math\.random/.test(file.body)).map((file) => file.path);
check('no Math.random at render time (PRD §16)', randomOffenders.length === 0, randomOffenders.join(', '));

const cssFiles = code.filter((file) => file.path.endsWith('.css'));

/*
 * This check used to read "no @import or url() webfont in CSS", which banned the mechanism
 * rather than the thing PRD §4 actually forbids — a network call at runtime. Self-hosting
 * the brand faces needs `@import`, and needs `url()` inside the packages it pulls in, while
 * fetching nothing: Vite resolves the specifier at build time and the .woff2 files land in
 * the bundle.
 *
 * So the rule is stated as what it means. **No CSS may reference a remote origin**, and any
 * font it does import must be a package that exists on disk and serves its files relatively.
 */
const REMOTE = /url\(\s*['"]?(?:https?:)?\/\//i;
const remoteCss = cssFiles.filter((file) => REMOTE.test(file.body) || /@import\s+(?:url\()?['"](?:https?:)?\/\//.test(file.body));
check('no CSS references a remote origin', remoteCss.length === 0, remoteCss.map((f) => f.path).join(', '));

/*
 * Every face is declared in our own CSS and sourced from a vendored package file. The checks
 * below are the three properties that actually matter, each of which was false at some point
 * while this was being built:
 *
 *   - the file exists on disk, so nothing is fetched from a CDN;
 *   - every face carries a `unicode-range`, without which an Arabic-only face downloads on a
 *     page of pure Latin — Fontsource's own Arabic stylesheet omits it, and it did;
 *   - no legacy `.woff` beside the `.woff2`, which was 112 KB of files no browser requests.
 */
const fontUrls = cssFiles.flatMap((file) =>
  [...file.text.matchAll(/url\(\s*['"]([^'"]+)['"]\s*\)/g)].map((match) => match[1] ?? ''),
);
check('every font file is a vendored package path', fontUrls.length > 0
  && fontUrls.every((url) => url.startsWith('@fontsource/')), fontUrls.join(', '));

const absent = fontUrls.filter((url) => !existsSync(join(ROOT, 'node_modules', url)));
check('every font file exists on disk, so nothing is fetched at runtime',
  absent.length === 0, absent.join(', '));

check('no legacy .woff is shipped beside the .woff2',
  fontUrls.every((url) => url.endsWith('.woff2')),
  fontUrls.filter((url) => !url.endsWith('.woff2')).join(', '));

const faceBlocks = cssFiles.flatMap((file) => [...file.text.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0]));
check('every @font-face declares a unicode-range', faceBlocks.length > 0
  && faceBlocks.every((block) => /unicode-range:/.test(block)),
  `${faceBlocks.filter((b) => !/unicode-range:/.test(b)).length} of ${faceBlocks.length} without`);

check('the two brand faces and the Arabic face are all declared',
  ['Fira Sans', 'Barlow', 'Tajawal'].every((family) =>
    faceBlocks.some((block) => block.includes(`'${family}'`))));

/* And the build must not undo it by base64-ing them back into the stylesheet. */
const viteConfig = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');
check('the build excludes fonts from asset inlining',
  /assetsInlineLimit[^\n]*=>/.test(viteConfig) && /woff2\?\$/.test(viteConfig));

// ---------------------------------------------------------------------------

heading('PRD §9 — numbers are never formatted inline');

/*
 * `toFixed` and `toLocaleString` belong in format.ts. Chart modules are exempt for
 * geometry only — an SVG coordinate is not a displayed number — so they are listed
 * explicitly rather than pattern-matched, and the list is short on purpose.
 */
const FORMAT_ALLOWED = new Set([
  'src/design/format.ts',
  'src/data/bank.ts', // assertion messages
  'src/data/entities.ts', // assertion messages
]);

const formatOffenders = code
  .filter((file) => !FORMAT_ALLOWED.has(file.path))
  .filter((file) => /\.toLocaleString\(/.test(file.body))
  .map((file) => file.path);
check(
  'toLocaleString is only used inside format.ts',
  formatOffenders.length === 0,
  formatOffenders.join(', '),
);

// ---------------------------------------------------------------------------

heading('Phase 4 — the complete chart library');

const registered = Object.keys(CHART_REGISTRY) as ChartComponent[];
const declared = Object.keys(VARIANTS_BY_COMPONENT) as ChartComponent[];

check(`all 23 components registered, got ${registered.length}`, registered.length === 23);
check(
  'every component in the catalogue has a renderer — no placeholders (PRD §13)',
  declared.every((component) => registered.includes(component)),
  declared.filter((component) => !registered.includes(component)).join(', '),
);
check(
  'no renderer is registered for a component the catalogue does not use',
  registered.every((component) => declared.includes(component)),
  registered.filter((component) => !declared.includes(component)).join(', '),
);

/** Every panel of all 163 insights must resolve to a real renderer. */
const unrenderable = allPanels().filter(({ panel }) => !registered.includes(panel.component));
check(
  'all 236 panels across the 163 insights have a renderer',
  unrenderable.length === 0,
  unrenderable.map(({ insight, panel }) => `${insight.id}:${panel.component}`).join(', '),
);

/** Every component any Executive panel asks for must be registered — no placeholders. */
const executiveComponents = new Set(
  byLayer('executive').flatMap((insight) => insight.panels.map((panel) => panel.component)),
);
const missing = [...executiveComponents].filter((component) => !registered.includes(component));
check('every Executive panel has a real renderer', missing.length === 0, missing.join(', '));
check(
  'Executive needs exactly 8 distinct components (plan §2.3)',
  executiveComponents.size === 8,
  `got ${executiveComponents.size}`,
);

/** One module per component, so the library stays navigable. */
const chartModules = sourceFiles.filter((file) =>
  /^src\/components\/charts\/[A-Z]/.test(file.path.replace(/\\/g, '/')),
);
check(
  `${declared.length} chart component modules on disk`,
  chartModules.length === declared.length,
  `${chartModules.length} found`,
);

check(
  'headline band reconciles to the bank fixture',
  HEADLINE_VALUES.totalAssets === bank.balanceSheet.totalAssets &&
    HEADLINE_VALUES.customerDeposits === bank.balanceSheet.customerDeposits &&
    HEADLINE_VALUES.netProfit === bank.income.netProfit &&
    HEADLINE_VALUES.car === bank.ratios.car,
);

check(
  `attention strip has ${CALLOUT_IDS.length} callouts, all pointing at real insights`,
  CALLOUT_IDS.length >= 3 && CALLOUT_IDS.length <= 4 && CALLOUT_IDS.every((id) => tryById(id) !== undefined),
  CALLOUT_IDS.filter((id) => tryById(id) === undefined).join(', '),
);
check(
  'the R-17 deposit-concentration callout is back in the strip (demo beat 5)',
  CALLOUT_IDS.includes('R-17'),
  CALLOUT_IDS.join(', '),
);
check(
  'every attention-strip callout is renderable',
  CALLOUT_IDS.every((id) => {
    const insight = tryById(id);
    return insight?.panels.every((panel) => registered.includes(panel.component)) ?? false;
  }),
);

// ---------------------------------------------------------------------------

heading('Phase 5 — insight pages');

/*
 * The three methodology checks that stood here are gone with the page (plan §2.23). They
 * asserted PRD Appendix A's six notes and two conventions, which no screen now shows — the
 * per-insight caveat in each card's "How this is calculated" is what survives, and that comes
 * from the catalogue, which `verify:data` already covers.
 */

/** 30 section tabs plus one `All` per layer (plan §1.2, Appendix B). */
const tabCount = LAYERS.reduce((sum, layer) => sum + sectionsFor(layer).length, 0);
check('30 section tabs across the four layers', tabCount === 30, `got ${tabCount}`);
check('plus 4 "All" tabs, giving 34 in total', tabCount + LAYERS.length === 34);
check(
  'every section slug is reachable as a route segment',
  LAYERS.every((layer) => sectionsFor(layer).every((section) => /^[a-z0-9-]+$/.test(section.slug))),
);

/** Charts must stay mounted across tab switches — A5. Verified in the browser by node
 *  identity; here we assert the source has not reverted to filtering the array. */
const insightPage = sourceFiles.find((file) => file.path.endsWith('InsightPage.tsx'));
check(
  'InsightPage toggles visibility rather than filtering (A5)',
  insightPage !== undefined && /hidden=\{!visible\}/.test(insightPage.text),
);
const executivePage = sourceFiles.find((file) => file.path.endsWith('Executive.tsx'));
check(
  'Executive does the same',
  executivePage !== undefined && /hidden=\{!visible\}/.test(executivePage.text),
);
/*
 * Charts never animate — not on mount, not on change (plan §2.18). The only motion in
 * the application is the Executive arrival.
 */
const animatedCharts = code.filter(
  (file) => /charts\/[A-Z]/.test(file.path.replace(/\\/g, '/')) && /isAnimationActive=/.test(file.body),
);
check(
  `all ${animatedCharts.length} Recharts components have animation off`,
  animatedCharts.every((file) => /isAnimationActive=\{CHART_ANIMATION\}/.test(file.body)),
  animatedCharts
    .filter((file) => !/isAnimationActive=\{CHART_ANIMATION\}/.test(file.body))
    .map((file) => file.path)
    .join(', '),
);
const common = code.find((file) => file.path.endsWith('charts/common.tsx'));
check(
  'CHART_ANIMATION is false, so no chart can opt itself back in',
  common !== undefined && /export const CHART_ANIMATION = false;/.test(common.body),
);
check(
  'no chart transitions on a data change',
  animatedCharts.every((file) => !/animationDuration=/.test(file.body) && !/useChartTransition/.test(file.body)),
);
const motion = code.find((file) => file.path.endsWith('motion.ts'));
check(
  'reduced motion is respected (design/motion.ts)',
  motion !== undefined && /prefers-reduced-motion/.test(motion.body),
);
check(
  'the arrival plays once per session and is not persisted',
  motion !== undefined && /let hasArrived/.test(motion.body) && !/localStorage/.test(motion.body),
);

// ---------------------------------------------------------------------------

heading('Phase 6 — filters and palette');

const has = (needle: string): boolean => sourceFiles.some((file) => file.path.endsWith(needle));
check('filter state lives in React context only (PRD §4)', has('FiltersContext.tsx'));
check('filter bar exists', has('FilterBar.tsx'));
check('command palette exists', has('CommandPalette.tsx'));

const shell = code.find((file) => file.path.endsWith('AppShell.tsx'));
check('the palette is mounted in the shell, so ⌘K works on every route',
  shell !== undefined && /<CommandPalette\s*\/>/.test(shell.body));
const topBar = code.find((file) => file.path.endsWith('TopBar.tsx'));
check('the filter bar is in the top bar', topBar !== undefined && /<FilterBar\s*\/>/.test(topBar.body));
const entry = code.find((file) => file.path.endsWith('main.tsx'));
check('the provider sits above the router, so filters survive navigation (PRD §12)',
  entry !== undefined && entry.body.indexOf('FiltersProvider') > entry.body.indexOf('BrowserRouter'));

const geo = code.find((file) => file.path.endsWith('GeoMap.tsx'));
check('GeoMap click sets the branch filter (PRD §12)',
  geo !== undefined && /setBranch\(/.test(geo.body));

/*
 * Removed routes must leave nothing behind. A stale `<Link to="/catalogue">` renders as a
 * working link and lands on the catch-all redirect — it looks like navigation and silently
 * is not, which is the failure mode worth a gate.
 */
const deadRoutes = ['/methodology', '/catalogue'];
const deadLinks = code.flatMap((file) =>
  deadRoutes
    .filter((route) => new RegExp(`to=["']${route}|href=["']${route}|path=["']${route}`).test(file.body))
    .map((route) => `${file.path}: ${route}`),
);
check('nothing links to a route that was removed', deadLinks.length === 0, deadLinks.join(', '));

const palette = code.find((file) => file.path.endsWith('CommandPalette.tsx'));
check('the palette searches every insight, not a subset',
  palette !== undefined && /insights\s*$|insights\b/m.test(palette.body) && /metaKey|ctrlKey/.test(palette.body));

/*
 * The catalogue page's four checks are gone with it. ⌘K remains the way to reach any of the
 * 163 by id or title, and the check below still holds it to searching every insight.
 */

// ---------------------------------------------------------------------------

heading('Phase 7 — demo polish');

const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const firstParagraph = readme.split('\n\n').find((block) => !block.startsWith('#')) ?? '';
check(
  'README states the data is synthetic in its first paragraph (PRD §17)',
  /synthetic/i.test(firstParagraph),
  firstParagraph.slice(0, 60),
);
check('README explains how to run it', /npm install/.test(readme) && /npm run dev/.test(readme));

const css = code.find((file) => file.path.endsWith('index.css'));
check('a print stylesheet exists (PRD §12)', css !== undefined && /@media print/.test(css.body));
check(
  'print avoids breaking cards across pages',
  css !== undefined && /break-inside:\s*avoid/.test(css.body),
);

const footer = code.find((file) => file.path.endsWith('AppShell.tsx'));
check(
  'the footer carries the standing synthetic-data line (PRD §16)',
  footer !== undefined && /Demonstration build/.test(footer.text),
);
const banner = code.find((file) => file.path.endsWith('DemoBanner.tsx'));
check(
  'the demo banner is not dismissible (PRD §11.1)',
  banner !== undefined && !/onClick|dismiss|useState/.test(banner.body),
);

/*
 * Two flexbox traps that pushed the page past 1280px in Phase 7. A flex item keeps
 * `min-width: auto` unless told otherwise, so a long label refuses to shrink and widens
 * the whole page. Both fixes are load-bearing for PRD §13's no-horizontal-scrollbar rule.
 */
const waterfall = code.find((file) => file.path.endsWith('WaterfallChart.tsx'));
check(
  'WaterfallChart columns can shrink (min-w-0)',
  waterfall !== undefined && /relative min-w-0 flex-1/.test(waterfall.body),
);
const donut = code.find((file) => file.path.endsWith('DonutChart.tsx'));
check(
  'DonutChart wraps its legend rather than overflowing',
  donut !== undefined && /flex min-w-0 flex-wrap/.test(donut.body),
);

/** Re-rendering 78 panels per tab click made switching take a second (plan §2.16). */
const cardSource = code.find((file) => file.path.endsWith('InsightCard.tsx'));
check(
  'InsightCard is memoised, so a tab change does not re-render every card',
  cardSource !== undefined && /memo\(function InsightCard/.test(cardSource.body),
);
const registrySource = code.find((file) => file.path.endsWith('registry.tsx'));
check(
  'InsightPanel memoises its seriesFor call',
  registrySource !== undefined && /useMemo\(/.test(registrySource.body),
);

// ---------------------------------------------------------------------------

heading('Summary');
console.log(`  ${sourceFiles.length} source files scanned`);
console.log(`  ${registered.length} of 23 chart components implemented`);
console.log(`  ${allPanels().length} panels, all renderable`);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.\n`);
  process.exit(1);
}
console.log('\nAll checks passed.\n');
