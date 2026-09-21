/**
 * Custom reports — gate for Phases A through H.
 *
 * Exercises the model, the scope pipeline and the share link against the spec's
 * invariants. Most of these fail silently in a running application: a `scope: undefined`
 * key puts a chip on a block that is doing exactly what the header says, and a missing
 * exemption only shows itself when somebody scopes a report to one branch and sees a map
 * with a single circle on it.
 *
 *   npm run verify:reports
 */

import {
  addBlock,
  blockUsage,
  byRecency,
  createReport,
  duplicateBlock,
  hasScope,
  makeBlock,
  moveBlock,
  removeBlock,
  renameReport,
  setBlockScope,
  setBlockTitle,
  upsertReport,
  DEFAULT_REPORT_NAME,
  type CustomReport,
} from '../src/reports/model.ts';
import {
  describeScope,
  exemptionsFor,
  ignoredScopeNote,
  resolveScope,
  scopeForBlock,
  viewForBlock,
} from '../src/reports/scope.ts';
import {
  decodeReport,
  encodeReport,
  readShareParam,
  shareUrl,
  shareWeight,
  SHARE_WARN_CHARS,
} from '../src/reports/share.ts';
import {
  blockDef,
  blockGroups,
  isKnownBlock,
  searchBlocks,
  starterBlocks,
  suggestedBlocks,
  tryBlockDef,
  BLOCKS,
  STARTER_BLOCK_IDS,
} from '../src/reports/catalogue.ts';
import { readFileSync } from 'node:fs';
import { byId, insights, sectionOf } from '../src/data/insights.ts';
import { seriesFor } from '../src/data/seriesFor.ts';
import { DEFAULT_FILTERS, describeFilters } from '../src/data/filters.ts';
import { ASOF } from '../src/data/bank.ts';
import {
  blockWidth,
  dropTargetIndex,
  edgeFor,
  railSlice,
  toBlockRows,
  RAIL_CAP,
} from '../src/reports/layout.ts';
import { csvForBlock, csvFilename, tableFor, toCsv } from '../src/reports/csv.ts';
import { cardSpan } from '../src/components/insight/layout.ts';
import type { ChartData, Filters } from '../src/types.ts';

let failures = 0;

/** `byId` throws by design; the card uses the safe form, so the gate tests that one. */
function byIdSafe(id: string) {
  return insights.find((insight) => insight.id === id);
}

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

const ids = (report: CustomReport): string[] => report.blocks.map((b) => b.blockId);

// ---------------------------------------------------------------------------

heading('Model — construction');

const empty = createReport();
check('a new report is empty and carries the default name',
  empty.blocks.length === 0 && empty.name === DEFAULT_REPORT_NAME);
check('a blank name falls back to the default', createReport('   ').name === DEFAULT_REPORT_NAME);
check('a given name is trimmed', createReport('  Q4 Baghdad  ').name === 'Q4 Baghdad');
check('ids are unique and carry no randomness',
  new Set([createReport().id, createReport().id, createReport().id]).size === 3);
check('createdAt and updatedAt start equal', empty.createdAt === empty.updatedAt);

heading('Model — the "absent, not undefined" rule');

const plain = makeBlock('R-17');
check('a block with no override has no `scope` key at all', !('scope' in plain), JSON.stringify(plain));
check('a block with no title has no `title` key at all', !('title' in plain));
check('an empty scope object is never stored', !('scope' in makeBlock('R-17', {})));
check('hasScope is false for undefined and for {}', !hasScope() && !hasScope({}));
check('hasScope is true for a real override', hasScope({ branch: 'basra' }));
check(
  'setting `all` explicitly IS an override — it overrides a filtered header',
  hasScope({ branch: 'all' }),
);

let report = addBlock(createReport('Scope test'), 'R-17');
const first = report.blocks[0]!;
report = setBlockScope(report, first.id, { branch: 'basra' });
check('setBlockScope stores the override', report.blocks[0]?.scope?.branch === 'basra');
report = setBlockScope(report, first.id, {});
check('clearing a scope deletes the key, never leaves undefined',
  !('scope' in (report.blocks[0] as object)), JSON.stringify(report.blocks[0]));

report = setBlockTitle(report, first.id, '  Deposit concentration, Basra  ');
check('setBlockTitle trims', report.blocks[0]?.title === 'Deposit concentration, Basra');
report = setBlockTitle(report, first.id, '   ');
check('an empty title deletes the key', !('title' in (report.blocks[0] as object)));

heading('Model — editing');

let edit = createReport('Edit');
edit = addBlock(edit, 'E-01');
edit = addBlock(edit, 'E-02');
edit = addBlock(edit, 'R-17');
check('addBlock appends', JSON.stringify(ids(edit)) === JSON.stringify(['E-01', 'E-02', 'R-17']));
check('every edit stamps updatedAt forward', edit.updatedAt > edit.createdAt);

const target = edit.blocks[1]!;
const scoped = setBlockTitle(setBlockScope(edit, target.id, { branch: 'basra' }), target.id, 'Basra NIM');
const duped = duplicateBlock(scoped, target.id);
check('duplicate lands beside its original, not at the end',
  JSON.stringify(ids(duped)) === JSON.stringify(['E-01', 'E-02', 'E-02', 'R-17']), ids(duped).join(','));
check('duplicate carries scope and title',
  duped.blocks[2]?.scope?.branch === 'basra' && duped.blocks[2]?.title === 'Basra NIM');
check('duplicate gets a new instance id', duped.blocks[1]?.id !== duped.blocks[2]?.id);

const moved = moveBlock(edit, edit.blocks[2]!.id, 0);
check('moveBlock reorders', JSON.stringify(ids(moved)) === JSON.stringify(['R-17', 'E-01', 'E-02']));
check('moveBlock clamps an out-of-range index',
  JSON.stringify(ids(moveBlock(edit, edit.blocks[0]!.id, 99))) === JSON.stringify(['E-02', 'R-17', 'E-01']));
check('a move that changes nothing returns the same object',
  moveBlock(edit, edit.blocks[0]!.id, 0) === edit);
check('removing an unknown id returns the same object', removeBlock(edit, 'nope') === edit);
check('removeBlock removes exactly one', removeBlock(edit, edit.blocks[1]!.id).blocks.length === 2);
check('renameReport falls back to the default on empty', renameReport(edit, '  ').name === DEFAULT_REPORT_NAME);
check('editing never mutates the original', JSON.stringify(ids(edit)) === JSON.stringify(['E-01', 'E-02', 'R-17']));

heading('Model — collections');

const a = createReport('A');
const b = createReport('B');
const c = renameReport(a, 'A edited');
check('byRecency puts the most recently edited first', byRecency([a, b, c])[0]?.name === 'A edited');
check('byRecency is stable when edits land in the same millisecond',
  byRecency([a, b])[0]?.id === b.id, 'timestamps must be strictly increasing');
check('upsert replaces by id, not appends', upsertReport([a, b], c).length === 2);
check('upsert appends something new', upsertReport([a], b).length === 2);

const usage = blockUsage([edit, duped]);
check('blockUsage counts across reports', usage.get('E-02') === 3, JSON.stringify([...usage]));

heading('Scope — I7, replace rather than merge');

const header: Filters = { period: '12M', branch: 'basra', division: 'retail', currency: 'USD' };
check('an absent scope inherits the header entirely', resolveScope(header) === header);
check('an override replaces just its own dimension',
  JSON.stringify(resolveScope(header, { branch: 'erbil-main' })) ===
    JSON.stringify({ ...header, branch: 'erbil-main' }));
check('overriding to `all` really does mean all, against a filtered header',
  resolveScope(header, { branch: 'all' }).branch === 'all');
check('a period override works — the one thing no other control expresses',
  resolveScope(header, { period: '24M' }).period === '24M');

heading('Scope — I6, blocks that compare across a dimension');

const geo = byId('G-40');          // Branch network performance — RankedBar + GeoMap
const divisionSplit = byId('E-06'); // Retail vs Corporate vs Treasury
const concentration = byId('R-17'); // Deposit concentration, top 1% / 5%
const ordinary = byId('E-05');      // Capital adequacy ratio

check('a GeoMap block is exempt from the branch filter', exemptionsFor(geo).branch, 'G-40');
check('the division split is exempt from the division filter', exemptionsFor(divisionSplit).division, 'E-06');
check('the concentration block is exempt from the branch filter', exemptionsFor(concentration).branch, 'R-17');
check('an ordinary block is exempt from nothing',
  !exemptionsFor(ordinary).branch && !exemptionsFor(ordinary).division, 'E-05');

check('scopeForBlock strips the branch for a map, and nothing else',
  JSON.stringify(scopeForBlock(geo, header)) === JSON.stringify({ ...header, branch: 'all' }),
  JSON.stringify(scopeForBlock(geo, header)));
check('an exempt block keeps its currency and period — a Basra map is still a USD question',
  scopeForBlock(geo, header).currency === 'USD' && scopeForBlock(geo, header).period === '12M');
check('an ordinary block passes through untouched', scopeForBlock(ordinary, header) === header);

check('viewForBlock applies the override first, then the exemption',
  JSON.stringify(viewForBlock(geo, header, { branch: 'erbil-main', currency: 'IQD' })) ===
    JSON.stringify({ period: '12M', branch: 'all', division: 'retail', currency: 'IQD' }),
  JSON.stringify(viewForBlock(geo, header, { branch: 'erbil-main', currency: 'IQD' })));

/* The failure this exists to prevent: a branch map with one circle on it. */
const mapAllBranches = seriesFor('G-40', 1, viewForBlock(geo, header, { branch: 'basra' }));
check('a map scoped to one branch still plots all eleven',
  mapAllBranches.shape === 'geoPoints' && mapAllBranches.points.length === 11,
  mapAllBranches.shape === 'geoPoints' ? `${mapAllBranches.points.length} points` : mapAllBranches.shape);

/*
 * The reviewed list, pinned. These were read one by one against the catalogue; an
 * exemption is the judgement most likely to produce an embarrassing chart, in either
 * direction, and it is derived from a regex over titles that somebody will tighten later.
 */
const EXPECT_BRANCH_EXEMPT = [
  'G-23', 'G-35', 'G-40', 'R-05', 'R-17', 'R-40', 'R-41', 'C-07', 'C-21', 'C-30',
];
const EXPECT_DIVISION_EXEMPT = ['E-06', 'G-46'];

const actualBranch = insights.filter((i) => exemptionsFor(i).branch).map((i) => i.id);
const actualDivision = insights.filter((i) => exemptionsFor(i).division).map((i) => i.id);
check(
  `exactly ${EXPECT_BRANCH_EXEMPT.length} insights are branch-exempt, and they are the reviewed ones`,
  JSON.stringify(actualBranch) === JSON.stringify(EXPECT_BRANCH_EXEMPT),
  `got ${actualBranch.join(',')}`,
);
check(
  `exactly ${EXPECT_DIVISION_EXEMPT.length} are division-exempt`,
  JSON.stringify(actualDivision) === JSON.stringify(EXPECT_DIVISION_EXEMPT),
  `got ${actualDivision.join(',')}`,
);
check(
  'sector concentration is NOT branch-exempt — inside one branch it is a real question',
  !exemptionsFor(byId('C-10')).branch,
);

heading('Scope — I3, the chip states it on the block\'s face');

/* Chips describe the block's view against the header, so both need naming. */
const plainHeader = DEFAULT_FILTERS;
const basraHeader: Filters = { ...DEFAULT_FILTERS, branch: 'basra' };

check('a block reading the header exactly gets no chips',
  describeScope(concentration, plainHeader).length === 0);
const chips = describeScope(ordinary, plainHeader, { branch: 'basra', period: '24M' });
check('chips are in the reader\'s words, not ids',
  chips.some((chip) => chip.label === 'Basra') && chips.some((chip) => chip.label === 'Last 24 months'),
  chips.map((chip) => chip.label).join(' · '));
check('a chip on an exempt dimension is marked as ignored',
  describeScope(geo, plainHeader, { branch: 'basra' })[0]?.ignored === true);
check('the ignored chip carries an explanatory note for the footnote',
  (ignoredScopeNote(describeScope(geo, plainHeader, { branch: 'basra' })) ?? '').includes('does not apply'));
check('an ordinary block gets no such note',
  ignoredScopeNote(describeScope(ordinary, plainHeader, { branch: 'basra' })) === undefined);

/*
 * The case the browser caught. An exempt block under a filtered *header* — no per-block
 * override anywhere — was showing a whole-bank figure with nothing on the card admitting
 * it, while the page header said "Basra" directly above.
 */
check('an exempt block admits a header filter it is ignoring, with no override involved',
  (() => {
    const only = describeScope(concentration, basraHeader);
    return only.length === 1 && only[0]?.key === 'branch' && only[0]?.ignored === true
      && only[0]?.label === 'Basra';
  })(),
  describeScope(concentration, basraHeader).map((chip) => `${chip.label}/${chip.ignored}`).join(','));
check('and the footnote sentence comes with it',
  (ignoredScopeNote(describeScope(concentration, basraHeader)) ?? '').includes('does not apply'));
check('a non-exempt block under the same header stays silent — it really is reading Basra',
  describeScope(ordinary, basraHeader).length === 0);

heading('Share link');

let shared = createReport('Q4 Baghdad review');
shared = addBlock(shared, 'E-01');
shared = addBlock(shared, 'R-17', { branch: 'basra', period: '24M' });
shared = setBlockTitle(shared, shared.blocks[1]!.id, 'Basra concentration');

const encoded = encodeReport(shared);
const decoded = decodeReport(encoded);

check('a link round-trips the blocks in order',
  decoded !== null && JSON.stringify(ids(decoded)) === JSON.stringify(['E-01', 'R-17']));
check('a link carries the name', decoded?.name === 'Q4 Baghdad review');
check('a link carries per-block scope', decoded?.blocks[1]?.scope?.branch === 'basra');
check('a link carries a per-block title', decoded?.blocks[1]?.title === 'Basra concentration');
check('a block with no override survives with no `scope` key',
  decoded !== null && !('scope' in (decoded.blocks[0] as object)));
check('decoding produces a NEW report — fresh id',
  decoded !== null && decoded.id !== shared.id);
check('decoding produces fresh block instance ids',
  decoded !== null && decoded.blocks[0]?.id !== shared.blocks[0]?.id);

/* PRD §9 anticipates Arabic; `btoa` on a string would throw here. */
let arabic = createReport('تقرير بغداد الربع الرابع');
arabic = addBlock(arabic, 'E-02');
const arabicDecoded = decodeReport(encodeReport(arabic));
check('a non-Latin name survives the round trip', arabicDecoded?.name === 'تقرير بغداد الربع الرابع',
  arabicDecoded?.name);

check('base64url carries no characters that need escaping in a URL',
  !/[+/=]/.test(encoded), encoded.slice(0, 40));
check('a truncated link returns null, rather than half a report',
  decodeReport(encoded.slice(0, Math.floor(encoded.length / 2))) === null);
check('gibberish returns null', decodeReport('!!!not-base64!!!') === null);
check('an empty payload returns null', decodeReport('') === null);
check('valid base64 that is not a report returns null', decodeReport(encodeReport(shared).slice(0, 8)) === null);

const url = shareUrl(shared, 'http://localhost:5173');
check('shareUrl lands on the index', url.startsWith('http://localhost:5173/reports?r='));
check('readShareParam recovers the payload from a query string',
  readShareParam(new URL(url).search) === encoded);
check('readShareParam returns null when there is none', readShareParam('?x=1') === null);

heading('Invariants that cross into the rest of the product');

check('every block id in a report resolves to a real insight',
  [...ids(edit), ...ids(shared)].every((id) => insights.some((insight) => insight.id === id)));
check('a report stores no figures — only references (I1)',
  !JSON.stringify(shared).includes('5240000000000') && !/"value"|"points"|"series"/.test(JSON.stringify(shared)));
check('a report stores no scope of its own (I2)',
  !('period' in shared) && !('filters' in shared) && !('scope' in shared));
check('a block carries no width — the grid packs (I5)',
  shared.blocks.every((block) => !('width' in block)));

/* I8 in the making: the panel and any future CSV both read this one call. */
const sameView = viewForBlock(concentration, header, { period: '24M' });
check('a block\'s view is a single resolved object both the panel and CSV can share',
  JSON.stringify(seriesFor('R-17', 0, sameView)) === JSON.stringify(seriesFor('R-17', 0, sameView)));

// ---------------------------------------------------------------------------
// Phase B — the registry adapter
// ---------------------------------------------------------------------------

heading('The block catalogue');

check('every insight is available as a block', BLOCKS.length === insights.length,
  `${BLOCKS.length} of ${insights.length}`);
check('block ids are unique', new Set(BLOCKS.map((block) => block.id)).size === BLOCKS.length);
check('every block resolves back to its insight', BLOCKS.every((block) => isKnownBlock(block.id)));
check('an id this build does not know returns undefined, not a throw',
  tryBlockDef('X-99') === undefined);
check('blockDef throws on an unknown id, so a bug cannot render a blank card',
  (() => { try { blockDef('X-99'); return false; } catch { return true; } })());

check('width comes from the same packer the section pages use (I5)',
  BLOCKS.every((block) => block.width === (cardSpan(byId(block.id)) === 2 ? 'full' : 'half')));
check('every block carries a description a reader can choose by',
  BLOCKS.every((block) => block.description.trim().length > 12));
check('every block names its section', BLOCKS.every((block) => block.section.length > 0
  && block.sectionSlug === sectionOf(byId(block.id)).slug));
check('every block declares a shape for its schematic',
  BLOCKS.every((block) => block.shape.length > 0));
check('all 15 shapes appear in the picker',
  new Set(BLOCKS.map((block) => block.shape)).size === 15,
  `${new Set(BLOCKS.map((block) => block.shape)).size}`);
check('exemptions on a block agree with the scope layer',
  BLOCKS.every((block) => {
    const direct = exemptionsFor(byId(block.id));
    return block.exempt.branch === direct.branch && block.exempt.division === direct.division;
  }));

heading('Grouping and search');

const groups = blockGroups();
check('four groups, one per layer', groups.length === 4, `${groups.length}`);
check('grouping loses no block',
  groups.reduce((total, group) => total + group.blocks.length, 0) === BLOCKS.length);
check('each group is labelled for a reader, not by key',
  groups.every((group) => group.label.length > 0 && group.label !== group.key));

check('search by exact id returns that block first', searchBlocks('R-17')[0]?.id === 'R-17');
check('search is case-insensitive', searchBlocks('r-17')[0]?.id === 'R-17');
check('search by a word in the title finds it',
  searchBlocks('concentration').some((block) => block.id === 'R-17'));
check('search by section name finds that section\'s blocks',
  searchBlocks('liquidity').length > 0);
check('an empty query returns everything, so the drawer opens full',
  searchBlocks('   ').length === BLOCKS.length);
check('a query matching nothing returns nothing rather than everything',
  searchBlocks('zzzzqqq').length === 0);
check('search never invents a block',
  searchBlocks('deposit').every((block) => isKnownBlock(block.id)));

heading('Suggestions and starters');

const pickerUsage = blockUsage([edit, shared]);
const suggested = suggestedBlocks(pickerUsage, 4);
check('"you use these" is drawn from the reader\'s own reports',
  suggested.every((block) => pickerUsage.has(block.id)));
check('most-used first',
  suggested.every((block, index) => index === 0
    || (pickerUsage.get(suggested[index - 1]!.id) ?? 0) >= (pickerUsage.get(block.id) ?? 0)));
check('an unknown id left over from an old link is not suggested',
  suggestedBlocks(new Map([['X-99', 9]])).length === 0);

check('four starters for an empty report', starterBlocks().length === 4);
check('every starter is a real block', STARTER_BLOCK_IDS.every((id) => isKnownBlock(id)));
check('the starters show four different shapes, not four of the same',
  new Set(starterBlocks().map((block) => block.shape)).size === 4,
  [...new Set(starterBlocks().map((block) => block.shape))].join(', '));

// ---------------------------------------------------------------------------
// Every block under a deliberately awkward scope
// ---------------------------------------------------------------------------

/*
 * The one check in this file that earns its keep twice over.
 *
 * A block written for its own page has only ever been rendered under that page's filters.
 * A report lets a reader point any of the 163 at a slice worth three thousandths of the
 * bank, and whatever breaks there breaks quietly — a bridge that draws nothing, an axis
 * of zeros, a division by an empty set.
 *
 * Running it found two real defects that had shipped: five of the twelve waterfalls did
 * not close (R-48's deltas fell 37.6% short of the closing bar drawn beside them), and
 * G-32 — "NPL formation & cures" — drew five deltas of exactly zero, at every scope
 * including the default one. Both were in the generic waterfall builder, and neither had
 * anything to do with custom reports.
 */

heading('Every block under an awkward scope');

const AWKWARD: readonly { readonly label: string; readonly view: Filters }[] = [
  // 4.5% of the bank x 13% of it x 0.5% of it — about three thousandths of one percent.
  { label: 'tightest slice in the product', view: { period: '3M', branch: 'duhok', division: 'treasury', currency: 'OTHER' } },
  { label: 'one small branch', view: { period: '3M', branch: 'duhok', division: 'all', currency: 'all' } },
  { label: 'exotic currencies only', view: { period: '12M', branch: 'all', division: 'all', currency: 'OTHER' } },
  { label: 'one division, longest window', view: { period: '24M', branch: 'all', division: 'treasury', currency: 'all' } },
];

function numbersIn(node: unknown, out: number[]): void {
  if (typeof node === 'number') { out.push(node); return; }
  if (Array.isArray(node)) { for (const value of node) numbersIn(value, out); return; }
  if (node && typeof node === 'object') { for (const value of Object.values(node)) numbersIn(value, out); }
}

function emptyArrayIn(node: unknown): boolean {
  if (Array.isArray(node)) return node.length === 0 || node.some(emptyArrayIn);
  if (node && typeof node === 'object') return Object.values(node).some(emptyArrayIn);
  return false;
}

const threw: string[] = [];
const nonFinite: string[] = [];
const emptied: string[] = [];
const allZero: string[] = [];
const unclosedBridges: string[] = [];
let rendered = 0;

for (const block of BLOCKS) {
  const insight = byId(block.id);
  for (const scenario of AWKWARD) {
    // The same pipeline the card uses: override the header, then strip what it compares.
    const view = viewForBlock(insight, scenario.view);
    insight.panels.forEach((_panel, index) => {
      const where = `${block.id} p${index} (${scenario.label})`;
      let data: ChartData;
      try {
        data = seriesFor(block.id, index, view);
      } catch (error) {
        threw.push(`${where}: ${String(error)}`);
        return;
      }
      rendered += 1;

      const values: number[] = [];
      numbersIn(data, values);
      if (values.some((value) => !Number.isFinite(value))) nonFinite.push(where);
      if (emptyArrayIn(data)) emptied.push(where);
      if (values.length > 0 && values.every((value) => value === 0)) allZero.push(where);

      if (data.shape === 'waterfallSteps') {
        const start = data.steps.find((step) => step.kind === 'start');
        const closing = data.steps.filter((step) => step.kind === 'total').at(-1);
        const deltas = data.steps.filter((step) => step.kind === 'delta');
        if (start && closing) {
          const implied = start.value + deltas.reduce((total, step) => total + step.value, 0);
          const scale = Math.max(Math.abs(closing.value), 1);
          if (Math.abs(implied - closing.value) / scale > 0.005) unclosedBridges.push(where);
        }
        if (deltas.length > 1 && deltas.every((step) => step.value === 0)) {
          unclosedBridges.push(`${where}: every delta zero`);
        }
      }
    });
  }
}

check(`all ${BLOCKS.length} blocks build under every awkward scope`, threw.length === 0,
  threw.slice(0, 3).join(' | '));
check('no NaN or Infinity reaches a chart', nonFinite.length === 0,
  `${nonFinite.length}: ${nonFinite.slice(0, 3).join(', ')}`);
check('no required array arrives empty', emptied.length === 0,
  `${emptied.length}: ${emptied.slice(0, 3).join(', ')}`);
check('no block collapses to all zeros, however thin the slice', allZero.length === 0,
  `${allZero.length}: ${allZero.slice(0, 3).join(', ')}`);
check('every waterfall closes: opening + deltas === closing', unclosedBridges.length === 0,
  `${unclosedBridges.length}: ${unclosedBridges.slice(0, 3).join(', ')}`);

/* The failure this whole section exists to prevent, stated once more at the extreme. */
const tightest = AWKWARD[0]!.view;
const mapView = viewForBlock(byId('G-40'), tightest);
/* G-40's map is its second panel; the exemption has to reach the whole insight (R2). */
check('a branch map scoped to one branch still plots all eleven',
  mapView.branch === 'all' && (() => {
    const data = seriesFor('G-40', 1, mapView);
    return data.shape === 'geoPoints' && data.points.length === 11;
  })());
check('an outlet dimension still applies to an exempt block',
  mapView.currency === 'OTHER' && mapView.division === 'treasury');

// ---------------------------------------------------------------------------
// Phase C — the report page
// ---------------------------------------------------------------------------

heading('Packing the grid (I5)');

/* R-02, R-03, R-06 and E-01 are halves; R-17 is a full. */
const order = ['R-02', 'R-03', 'R-17', 'R-06', 'E-01'];
const packed = toBlockRows(order.map((id) => makeBlock(id)));
const shape = packed.map((row) => row.map((block) => block.blockId).join('+')).join(' | ');

check('the widths this fixture assumes are the widths the catalogue gives',
  ['R-02', 'R-03', 'R-06', 'E-01'].every((id) => blockDef(id).width === 'half')
    && blockDef('R-17').width === 'full');
check('a full-width block gets a row to itself, and the halves pair around it',
  shape === 'R-02+R-03 | R-17 | R-06+E-01', shape);
check('no row holds more than two blocks', packed.every((row) => row.length <= 2));
check('packing loses no block',
  packed.reduce((total, row) => total + row.length, 0) === order.length);
check('packing preserves the reader\'s order',
  packed.flatMap((row) => row.map((block) => block.blockId)).join(',') === order.join(','));
check('no half is left stranded in a row of its own beside a full',
  packed.filter((row) => row.length === 1).every((row) => blockWidth(row[0]!) === 'full'));
check('an empty report packs to no rows', toBlockRows([]).length === 0);
check('a trailing odd half still gets a row',
  toBlockRows([makeBlock('R-02'), makeBlock('R-03'), makeBlock('R-06')]).length === 2);

/* An unknown id still occupies a slot, so the rest of the report keeps its shape. */
check('an unknown block id packs as a half rather than vanishing',
  blockWidth(makeBlock('X-99')) === 'half'
    && toBlockRows([makeBlock('X-99'), makeBlock('R-02')]).length === 1);

heading('The share link as the save button (R1)');

const full = addBlock(
  addBlock(renameReport(createReport(), 'Q3 board pack'), 'R-17', { branch: 'basra' }),
  'E-01',
);
const landingUrl = shareUrl(full, 'https://rtb.example', '/reports');
const landed = decodeReport(readShareParam(new URL(landingUrl).search) ?? '');

check('a link lands on /reports, where the index imports it',
  new URL(landingUrl).pathname === '/reports' && new URL(landingUrl).searchParams.has('r'));
check('the round trip keeps the name', landed?.name === 'Q3 board pack');
check('the round trip keeps the blocks in order',
  landed?.blocks.map((block) => block.blockId).join(',') === 'R-17,E-01');
check('the round trip keeps a per-block slice', landed?.blocks[0]?.scope?.branch === 'basra');
check('a block with no slice does not gain one',
  landed !== null && !('scope' in landed.blocks[1]!));
check('the copy is the reader\'s own — new report id', landed?.id !== full.id);
check('the copy is the reader\'s own — new block instance ids',
  landed?.blocks.every((block, index) => block.id !== full.blocks[index]?.id) === true);
check('the link survives a name that btoa alone could not encode',
  (() => {
    const arabic = renameReport(createReport(), 'تقرير الإدارة');
    return decodeReport(encodeReport(arabic))?.name === 'تقرير الإدارة';
  })());
check('a truncated link decodes to null, so the page can say so',
  decodeReport(encodeReport(full).slice(0, 12)) === null);
check('a link with no payload reads as absent, not as an empty report',
  readShareParam('?r=') === null && readShareParam('') === null);

heading('What the page must render');

/* The card resolves its own insight; an id the build does not know must not throw. */
check('an unknown block id resolves to undefined rather than throwing',
  tryBlockDef('X-99') === undefined && byIdSafe('X-99') === undefined);

/* Every block on a report is rendered through the same pipeline as its home page. */
const pageHeader: Filters = { period: '12M', branch: 'basra', division: 'retail', currency: 'USD' };
const inherited = makeBlock('R-01');
const overridden = makeBlock('R-01', { period: '24M' });
check('a block with no slice reads exactly the header',
  JSON.stringify(viewForBlock(byId('R-01'), pageHeader, inherited.scope))
    === JSON.stringify(viewForBlock(byId('R-01'), pageHeader)));
check('a block with a slice overrides only that dimension (I7)',
  (() => {
    const view = viewForBlock(byId('R-01'), pageHeader, overridden.scope);
    return view.period === '24M' && view.branch === 'basra'
      && view.division === 'retail' && view.currency === 'USD';
  })());
check('a chip is shown for the overridden dimension and nothing else (I3)',
  describeScope(byId('R-01'), pageHeader, overridden.scope).length === 1);
check('a block reading the header shows no chips at all',
  describeScope(byId('R-01'), pageHeader, inherited.scope).length === 0);

/* The summary line on the index has to tell two reports apart. */
check('the index can name a block without generating its data',
  tryBlockDef('R-17')?.label === byId('R-17').title);

// ---------------------------------------------------------------------------
// Phase E — the menu, and CSV for every block
// ---------------------------------------------------------------------------

heading('CSV — one writer, fifteen shapes');

const csvShapes = new Set<string>();
const badHeader: string[] = [];
const raggedRows: string[] = [];
const emptyTables: string[] = [];
const unparsable: string[] = [];

/** Parses one RFC 4180 line back, so the gate reads what a spreadsheet would read. */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { out.push(field); field = ''; }
    else field += char;
  }
  out.push(field);
  return out;
}

for (const block of BLOCKS) {
  const insight = byId(block.id);
  const view = viewForBlock(insight, DEFAULT_FILTERS);
  insight.panels.forEach((_panel, panelIndex) => {
    const data = seriesFor(block.id, panelIndex, view);
    const table = tableFor(data);
    csvShapes.add(data.shape);

    const where = `${block.id} p${panelIndex} (${data.shape})`;
    if (table.columns.length === 0 || table.columns.some((column) => column.trim().length === 0)) {
      badHeader.push(where);
    }
    if (table.rows.length === 0) emptyTables.push(where);
    if (table.rows.some((row) => row.length !== table.columns.length)) raggedRows.push(where);

    // Round-trip every line: a quoting bug shows up as a row that parses to the wrong width.
    const lines = toCsv(table).split('\r\n');
    if (lines.some((line) => parseLine(line).length !== table.columns.length)) {
      unparsable.push(where);
    }
  });
}

check('every shape has a CSV case', csvShapes.size === 15, `${csvShapes.size}: ${[...csvShapes].join(', ')}`);
check('every block produces a header row', badHeader.length === 0,
  `${badHeader.length}: ${badHeader.slice(0, 3).join(', ')}`);
check('every block produces at least one data row', emptyTables.length === 0,
  `${emptyTables.length}: ${emptyTables.slice(0, 3).join(', ')}`);
check('no row disagrees with its header on width', raggedRows.length === 0,
  `${raggedRows.length}: ${raggedRows.slice(0, 3).join(', ')}`);
check('every line parses back to the right number of fields', unparsable.length === 0,
  `${unparsable.length}: ${unparsable.slice(0, 3).join(', ')}`);

heading('CSV — quoting, injection and encoding');

const nasty = toCsv({
  columns: ['Label', 'Value'],
  rows: [
    ['Fees, commissions', 1],
    ['He said "yes"', 2],
    ['Line\nbreak', 3],
    ['=SUM(A1:A9)', 4],
    ['-14.5% vs plan', 5],
    ['+VAT', 6],
    ['@handle', 7],
  ],
});
check('a comma inside a field is quoted', nasty.includes('"Fees, commissions"'));
check('a quote inside a field is doubled', nasty.includes('"He said ""yes"""'));
check('a newline inside a field is quoted', nasty.includes('"Line\nbreak"'));
/*
 * The one that is a security question rather than a formatting one. Excel and Sheets treat
 * a leading =, +, - or @ as the start of a formula, so a label beginning with a minus sign
 * opens as #NAME? at best — and in the general case the cell runs whatever the text says.
 */
check('a formula-leading field is defused with an apostrophe',
  nasty.includes("'=SUM(A1:A9)") && nasty.includes("'-14.5% vs plan")
    && nasty.includes("'+VAT") && nasty.includes("'@handle"));
check('numbers are written bare, so they arrive as numbers',
  parseLine(nasty.split('\r\n')[1] ?? '')[1] === '1');
check('a non-finite number becomes an empty cell rather than the text NaN',
  toCsv({ columns: ['a'], rows: [[Number.NaN], [Number.POSITIVE_INFINITY]] }) === 'a\r\n\r\n');
check('lines are CRLF', nasty.split('\r\n').length === 8);

heading('CSV — the file says what slice it is (I8)');

const exportView: Filters = { period: '24M', branch: 'basra', division: 'retail', currency: 'USD' };
const exported = csvForBlock({
  id: 'R-01',
  title: 'My own title',
  slice: describeFilters(exportView),
  asOf: ASOF,
  panels: byId('R-01').panels.map((panel, index) => ({
    label: panel.component,
    data: seriesFor('R-01', index, viewForBlock(byId('R-01'), exportView)),
  })),
});
check('the file names the insight and the reader\'s own title',
  exported.includes('R-01 — My own title'));
check('the file names the slice, so a column of numbers cannot be read as the whole bank',
  exported.includes('Basra') && exported.includes('USD'));
check('the file names the as-of date', exported.includes(ASOF));
check('the file states the figures are synthetic', /synthetic/i.test(exported));
check('a two-panel block writes both panels',
  byId('R-01').panels.length === 1 || exported.split('\r\n\r\n').length >= 2);

check('the filename is safe and still recognisable',
  csvFilename('R-17', 'Deposit concentration (top 1% / 5% of customers)')
    === 'R-17-deposit-concentration-top-1-5-of-customers.csv',
  csvFilename('R-17', 'Deposit concentration (top 1% / 5% of customers)'));
check('an Arabic title still yields a usable filename',
  csvFilename('E-01', 'تقرير') === 'E-01.csv', csvFilename('E-01', 'تقرير'));

/* A waterfall's running total is the column a reader reaches for. */
const bridge = tableFor(seriesFor('G-32', 0, DEFAULT_FILTERS));
check('a bridge exports its running total, and it closes',
  bridge.columns.includes('Running total')
    && bridge.rows[0]?.[3] === bridge.rows[bridge.rows.length - 1]?.[3],
  `${String(bridge.rows[0]?.[3])} vs ${String(bridge.rows[bridge.rows.length - 1]?.[3])}`);

heading('The menu\'s verbs are the model\'s');

/* Each menu item is one model call, so the gate exercises the sequence the menu produces. */
let edited = addBlock(addBlock(createReport('Menu'), 'R-17'), 'R-02');
const firstId = edited.blocks[0]!.id;

edited = setBlockScope(edited, firstId, { period: '24M' });
check('“Change this block\'s slice” stores only what was set',
  JSON.stringify(edited.blocks[0]?.scope) === JSON.stringify({ period: '24M' }));
edited = setBlockScope(edited, firstId, undefined);
check('“Follow the page” deletes the key rather than storing an empty object',
  !('scope' in edited.blocks[0]!));

edited = setBlockTitle(edited, firstId, '  Board view  ');
check('a title is trimmed', edited.blocks[0]?.title === 'Board view');
edited = setBlockTitle(edited, firstId, '');
check('an empty title restores the insight\'s own', !('title' in edited.blocks[0]!));

edited = setBlockTitle(edited, firstId, 'Keep me');
edited = duplicateBlock(edited, firstId);
check('Duplicate lands beside its original, not at the end',
  edited.blocks.map((block) => block.blockId).join(',') === 'R-17,R-17,R-02');
check('the duplicate carries the title but is its own instance',
  edited.blocks[1]?.title === 'Keep me' && edited.blocks[1]?.id !== firstId);

const lastId = edited.blocks[2]!.id;
edited = moveBlock(edited, lastId, 0);
check('Move up moves one place', edited.blocks[0]?.id === lastId);
const unmoved = moveBlock(edited, lastId, -1);
check('a move past the top is a no-op, not a reorder and a new timestamp', unmoved === edited);
const alsoUnmoved = moveBlock(edited, edited.blocks[2]!.id, 99);
check('a move past the end is clamped to the end',
  alsoUnmoved.blocks[2]?.id === edited.blocks[2]?.id);

edited = removeBlock(edited, lastId);
check('Remove takes exactly one instance, not every copy of that insight',
  edited.blocks.length === 2 && edited.blocks.every((block) => block.id !== lastId));

// ---------------------------------------------------------------------------
// Phase F — reordering by drag
// ---------------------------------------------------------------------------

heading('Drag arithmetic');

/**
 * Drives a drop through the *same* two steps the page does — `dropTargetIndex` then
 * `moveBlock` — and states the answer as the order a reader would see.
 *
 * Checking the index in isolation would pass with the off-by-one still in place, because the
 * off-by-one is in how the index relates to `moveBlock`'s post-removal array, not in the
 * index itself.
 */
function drop(order: string, dragged: string, target: string, edge: 'before' | 'after'): string {
  let report = createReport('Drag');
  for (const id of order.split(',')) report = addBlock(report, id);

  const idOf = (blockId: string): string =>
    report.blocks[order.split(',').indexOf(blockId)]!.id;

  const from = order.split(',').indexOf(dragged);
  const over = order.split(',').indexOf(target);
  const moved = moveBlock(report, idOf(dragged), dropTargetIndex(from, over, edge));
  return moved.blocks.map((block) => block.blockId).join(',');
}

const ABCD = 'A,B,C,D';

check('dragging the first block after the third lands it third',
  drop(ABCD, 'A', 'C', 'after') === 'B,C,A,D', drop(ABCD, 'A', 'C', 'after'));
check('dragging the first block before the third lands it second',
  drop(ABCD, 'A', 'C', 'before') === 'B,A,C,D', drop(ABCD, 'A', 'C', 'before'));
check('dragging the last block before the second lands it second',
  drop(ABCD, 'D', 'B', 'before') === 'A,D,B,C', drop(ABCD, 'D', 'B', 'before'));
check('dragging the last block after the second lands it third',
  drop(ABCD, 'D', 'B', 'after') === 'A,B,D,C', drop(ABCD, 'D', 'B', 'after'));
check('dragging backwards onto the first block puts it first',
  drop(ABCD, 'C', 'A', 'before') === 'C,A,B,D', drop(ABCD, 'C', 'A', 'before'));
check('dragging forwards onto the last block puts it last',
  drop(ABCD, 'B', 'D', 'after') === 'A,C,D,B', drop(ABCD, 'B', 'D', 'after'));

/*
 * The adjacent cases, which are the ones an off-by-one hides in: dropping a block on the
 * near side of its own neighbour must be a no-op, not a swap.
 */
check('dropping just after the block already behind it changes nothing',
  drop(ABCD, 'B', 'A', 'after') === 'A,B,C,D', drop(ABCD, 'B', 'A', 'after'));
check('dropping just before the block already ahead of it changes nothing',
  drop(ABCD, 'B', 'C', 'before') === 'A,B,C,D', drop(ABCD, 'B', 'C', 'before'));
check('dropping onto an immediate neighbour\'s far side swaps them',
  drop(ABCD, 'B', 'C', 'after') === 'A,C,B,D', drop(ABCD, 'B', 'C', 'after'));

check('a two-block report still reorders',
  drop('A,B', 'A', 'B', 'after') === 'B,A', drop('A,B', 'A', 'B', 'after'));

/* Stated directly too, so the reason for the −1 is recorded and not just implied. */
check('an index at or past the origin is shifted down by one',
  dropTargetIndex(0, 2, 'after') === 2 && dropTargetIndex(0, 2, 'before') === 1);
check('an index before the origin is used as it stands',
  dropTargetIndex(3, 1, 'before') === 1 && dropTargetIndex(3, 1, 'after') === 2);

heading('Which edge the pointer is on');

const rect = { left: 100, width: 200 } as DOMRect;
check('past the midpoint is "after" in LTR', edgeFor(rect, 250, false) === 'after');
check('before the midpoint is "before" in LTR', edgeFor(rect, 150, false) === 'before');
/*
 * The shell is built with logical properties for the Arabic in PRD §9. Under RTL the leading
 * edge is on the right, so a hardcoded `x < midpoint` would invert every drop — silently,
 * and only for readers using the language the bank actually operates in.
 */
check('the sides are the other way round in RTL', edgeFor(rect, 250, true) === 'before'
  && edgeFor(rect, 150, true) === 'after');
check('exactly on the midpoint resolves without ambiguity',
  edgeFor(rect, 200, false) === 'before' && edgeFor(rect, 200, true) === 'after');

// ---------------------------------------------------------------------------
// Phase G — the nav rail
// ---------------------------------------------------------------------------

heading('The rail is capped, and says how many it is hiding');

const many = Array.from({ length: 6 }, (_value, index) => `r${index}`);
check(`the rail shows at most ${RAIL_CAP}`, railSlice(many).shown.length === RAIL_CAP);
check('and says how many it is not showing', railSlice(many).hidden === 2);
check('under the cap, it shows everything and hides none',
  railSlice(['a', 'b']).shown.length === 2 && railSlice(['a', 'b']).hidden === 0);
/* The case a bare `length - CAP` gets wrong, printing "+-2 more" rather than failing. */
check('a shorter list never reports a negative overflow',
  railSlice(['a', 'b']).hidden >= 0 && railSlice([]).hidden === 0);
check('exactly at the cap, nothing is hidden',
  railSlice(many.slice(0, RAIL_CAP)).hidden === 0);
check('the rail keeps the order it was given, which is most recent first',
  railSlice(many).shown.join(',') === 'r0,r1,r2,r3');

/* The rail reads `reports` straight from the context, which is already ordered. */
const older = renameReport(createReport('Older'), 'Older');
const newer = renameReport(createReport('Newer'), 'Newer');
check('most recently edited comes first, so the rail leads with the one in hand',
  byRecency([older, newer])[0]?.name === 'Newer');

// ---------------------------------------------------------------------------
// Phase H — copy link, and the page on paper
// ---------------------------------------------------------------------------

heading('How long a link gets');

function sized(count: number, heavy: boolean): CustomReport {
  let report = createReport(heavy ? 'تقرير الإدارة الشهري للجنة الأصول والخصوم' : 'Q3 board pack');
  for (let index = 0; index < count; index += 1) {
    report = addBlock(report, BLOCKS[index % BLOCKS.length]!.id);
  }
  if (!heavy) return report;
  for (const block of report.blocks) {
    report = setBlockScope(report, block.id, {
      period: '24M', branch: 'basra', division: 'retail', currency: 'USD',
    });
    report = setBlockTitle(report, block.id, 'Deposit concentration for the board');
  }
  return report;
}

/*
 * The link is the only copy of a report (R1), so its length is a correctness property, not a
 * nicety: mail clients and chat windows cut long URLs, and a cut link is lost work.
 */
check('a plain report of forty blocks stays far inside the safe range',
  shareWeight(sized(40, false)).chars < SHARE_WARN_CHARS
    && !shareWeight(sized(40, false)).long,
  `${shareWeight(sized(40, false)).chars} chars`);
check('an ordinary report is not warned about',
  !shareWeight(sized(12, false)).long, `${shareWeight(sized(12, false)).chars} chars`);
check('a report where every block carries its own slice and title is warned about',
  shareWeight(sized(12, true)).long, `${shareWeight(sized(12, true)).chars} chars`);
check('the warning can name what is making it long',
  shareWeight(sized(12, true)).overrides === 12);
check('a report with no overrides reports none, so the warning does not blame them',
  shareWeight(sized(12, false)).overrides === 0);
check('an empty report has a short link and no warning',
  !shareWeight(createReport('Empty')).long);

/* Whatever the length, it still has to survive the trip. */
const huge = sized(40, true);
check('even the longest realistic report round-trips intact',
  decodeReport(encodeReport(huge))?.blocks.length === 40);
check('and keeps every per-block slice',
  decodeReport(encodeReport(huge))?.blocks.every((block) => block.scope?.branch === 'basra') === true);

heading('The page on paper');

/*
 * Two print defects, asserted against the stylesheet because they cannot be observed from a
 * script — a print preview is not reachable here.
 *
 * A chip's shape is a CSS background, and browsers drop backgrounds unless the reader ticks
 * "Background graphics", which is off by default. A scope chip is `bg-navy text-surface`, so
 * it would print as white text on white paper: the one mark saying "this panel is not reading
 * what the header says" disappears exactly when the document leaves the room.
 */
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const printBlock = css.slice(css.indexOf('@media print'));

check('print gives every chip a border and ink instead of a background',
  /\[data-chip\][^}]*background:\s*transparent[^}]*!important/s.test(printBlock)
    && /\[data-chip\][^}]*border:[^}]*!important/s.test(printBlock));
/*
 * The rule is only worth anything if it finds the chips. This edit was applied twice: the
 * first attempt matched nothing in `Badge.tsx` and failed silently, leaving a correct print
 * rule pointed at an attribute no element carried.
 */
const badge = readFileSync(new URL('../src/components/ui/Badge.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../src/components/reports/ReportBlockCard.tsx', import.meta.url), 'utf8');
check('every chip component actually carries the hook the print rule looks for',
  /data-chip=\{tone\}/.test(badge) && /data-chip="id"/.test(badge)
    && /data-chip=\{chip\.ignored \? 'ignored' : 'scope'\}/.test(card));

check('print keeps the ignored chip struck through',
  /\[data-chip='ignored'\][^}]*line-through/s.test(printBlock));
check('print hides the disclosure summaries, which cannot be clicked on paper',
  /details\s*>\s*summary\s*\{[^}]*display:\s*none/s.test(printBlock));

/*
 * And the sentence that explains a struck chip lives inside a closed `<details>`, which prints
 * nothing but its summary. Promoted for print in `InsightBody`, or a printed report shows a
 * struck-through "Basra" with no explanation anywhere on the page.
 */
const body = readFileSync(new URL('../src/components/insight/InsightBody.tsx', import.meta.url), 'utf8');
check('the ignored-scope sentence is promoted for print',
  /hidden[^"']*print:block/.test(body) && body.includes('{note}'));

/* Nothing interactive belongs on the printed page. */
const view = readFileSync(new URL('../src/pages/ReportView.tsx', import.meta.url), 'utf8');
const share = readFileSync(new URL('../src/components/reports/ShareLink.tsx', import.meta.url), 'utf8');
check('the report page\'s controls are hidden in print',
  view.includes('print:hidden') && share.includes('print:hidden'));

/* No hardcoded colour crept into the print rules — the same A1 rule as everywhere else. */
check('the print rules resolve their colours from tokens',
  !/#[0-9a-fA-F]{3,8}\b/.test(printBlock) && printBlock.includes("theme('colors."));

// ---------------------------------------------------------------------------

heading('Summary');
console.log(`  ${insights.length} insights available as blocks`);
console.log(`  ${rendered} panel builds exercised across ${AWKWARD.length} awkward scopes`);
const exemptBranch = insights.filter((insight) => exemptionsFor(insight).branch).length;
const exemptDivision = insights.filter((insight) => exemptionsFor(insight).division).length;
console.log(`  ${exemptBranch} exempt from the branch filter, ${exemptDivision} from division`);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.\n`);
  process.exit(1);
}
console.log('\nAll checks passed.\n');
