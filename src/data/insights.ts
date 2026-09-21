/**
 * Typed loader and selectors over the insight catalogue.
 *
 * The JSON array order IS workbook order (plan §1.2: IDs are contiguous and
 * ascending within each layer), so every selector here preserves array order and
 * nothing sorts. Pages, tabs and prev/next all derive from it.
 */

import rawCatalogue from './RTB_insights.json' with { type: 'json' };
import {
  LAYERS,
  VARIANTS_BY_COMPONENT,
  type ChartComponent,
  type ChartVariant,
  type Insight,
  type InsightCatalogue,
  type Layer,
  type Panel,
  type Refresh,
  type Section,
  type Unit,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

/**
 * Section name -> URL segment. `&` becomes a word break rather than a literal, so
 * `Deposits & Liabilities` -> `deposits-liabilities`, matching PRD §10's examples.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const UNITS: readonly Unit[] = ['iqd', 'percent', 'count'];
const REFRESHES: readonly Refresh[] = ['Daily', 'Daily / Monthly', 'Monthly', 'Monthly / Quarterly'];

function fail(where: string, message: string): never {
  throw new Error(`RTB_insights.json — ${where}: ${message}`);
}

function readString(record: Record<string, unknown>, field: string, where: string): string {
  const value = record[field];
  if (typeof value !== 'string' || value.length === 0) {
    fail(where, `field "${field}" must be a non-empty string, got ${JSON.stringify(value)}`);
  }
  return value;
}

function parsePanel(value: unknown, where: string): Panel {
  if (typeof value !== 'object' || value === null) fail(where, 'panel must be an object');
  const record = value as Record<string, unknown>;
  const component = readString(record, 'component', where) as ChartComponent;
  const variant = readString(record, 'variant', where) as ChartVariant;

  const known = VARIANTS_BY_COMPONENT[component] as readonly string[] | undefined;
  if (!known) {
    fail(where, `unknown component "${component}". If the catalogue grew, add it to ChartComponent and VARIANTS_BY_COMPONENT.`);
  }
  if (!known.includes(variant)) {
    fail(where, `component "${component}" has no variant "${variant}" (known: ${known.join(', ')})`);
  }
  return { component, variant };
}

function parseInsight(value: unknown, index: number): Insight {
  const where = `insights[${index}]`;
  if (typeof value !== 'object' || value === null) fail(where, 'record must be an object');
  const record = value as Record<string, unknown>;

  const id = readString(record, 'id', where);
  const at = `${where} (${id})`;

  const layer = readString(record, 'layer', at) as Layer;
  if (!LAYERS.includes(layer)) fail(at, `unknown layer "${layer}"`);

  const unit = readString(record, 'unit', at) as Unit;
  if (!UNITS.includes(unit)) fail(at, `unknown unit "${unit}"`);

  const refresh = readString(record, 'refresh', at) as Refresh;
  if (!REFRESHES.includes(refresh)) fail(at, `unknown refresh "${refresh}"`);

  if (typeof record['demoPath'] !== 'boolean') fail(at, 'demoPath must be a boolean');

  const rawPanels = record['panels'];
  if (!Array.isArray(rawPanels)) fail(at, 'panels must be an array');
  if (rawPanels.length !== 1 && rawPanels.length !== 2) {
    fail(at, `panels must hold 1 or 2 entries, got ${rawPanels.length}`);
  }
  const first = parsePanel(rawPanels[0], `${at} panels[0]`);
  const panels: readonly [Panel] | readonly [Panel, Panel] =
    rawPanels.length === 2 ? [first, parsePanel(rawPanels[1], `${at} panels[1]`)] : [first];

  return {
    id,
    layer,
    layerLabel: readString(record, 'layerLabel', at),
    domain: readString(record, 'domain', at),
    group: readString(record, 'group', at),
    title: readString(record, 'title', at),
    whatItTells: readString(record, 'whatItTells', at),
    method: readString(record, 'method', at),
    vizLabel: readString(record, 'vizLabel', at),
    panels,
    refresh,
    unit,
    demoPath: record['demoPath'],
  };
}

function parseCatalogue(value: unknown): InsightCatalogue {
  if (typeof value !== 'object' || value === null) fail('root', 'must be an object');
  const record = value as Record<string, unknown>;

  const generatedFrom = readString(record, 'generatedFrom', 'root');
  const count = record['count'];
  if (typeof count !== 'number') fail('root', 'count must be a number');

  const rawInsights = record['insights'];
  if (!Array.isArray(rawInsights)) fail('root', 'insights must be an array');
  if (rawInsights.length !== count) {
    fail('root', `count says ${count} but insights holds ${rawInsights.length}`);
  }

  const insights = rawInsights.map(parseInsight);

  const seen = new Set<string>();
  for (const insight of insights) {
    if (seen.has(insight.id)) fail('root', `duplicate id "${insight.id}"`);
    seen.add(insight.id);
  }

  return { generatedFrom, count, insights };
}

/** Validated at module load, so a malformed catalogue fails before any render. */
export const catalogue: InsightCatalogue = parseCatalogue(rawCatalogue as unknown);

export const insights: readonly Insight[] = catalogue.insights;

// ---------------------------------------------------------------------------
// Indexes — built once
// ---------------------------------------------------------------------------

const byIdIndex = new Map<string, Insight>(insights.map((insight) => [insight.id, insight]));

const byLayerIndex = new Map<Layer, readonly Insight[]>(
  LAYERS.map((layer) => [layer, insights.filter((insight) => insight.layer === layer)]),
);

const sectionsIndex = new Map<Layer, readonly Section[]>(
  LAYERS.map((layer) => {
    const forLayer = byLayerIndex.get(layer) ?? [];
    const sections: Section[] = [];

    for (const insight of forLayer) {
      if (sections.some((section) => section.key === insight.group)) continue;
      const members = forLayer.filter((candidate) => candidate.group === insight.group);
      sections.push({
        layer,
        key: insight.group,
        slug: slugify(insight.group),
        // `domain` is correctly cased where `group` is not — plan §2.5.
        label: insight.domain,
        count: members.length,
        order: sections.length,
      });
    }

    return [layer, sections];
  }),
);

/** Keyed `layer::slug` because section slugs are unique per layer, not globally (plan §2.6). */
const sectionBySlugIndex = new Map<string, Section>();
for (const sections of sectionsIndex.values()) {
  for (const section of sections) sectionBySlugIndex.set(`${section.layer}::${section.slug}`, section);
}

const membersIndex = new Map<string, readonly Insight[]>();
for (const section of sectionBySlugIndex.values()) {
  membersIndex.set(
    `${section.layer}::${section.slug}`,
    (byLayerIndex.get(section.layer) ?? []).filter((insight) => insight.group === section.key),
  );
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function tryById(id: string): Insight | undefined {
  return byIdIndex.get(id);
}

/** Throws on an unknown id — a broken deep link should be loud, not blank. */
export function byId(id: string): Insight {
  const insight = byIdIndex.get(id);
  if (!insight) throw new Error(`Unknown insight id "${id}"`);
  return insight;
}

export function byLayer(layer: Layer): readonly Insight[] {
  return byLayerIndex.get(layer) ?? [];
}

/** Section tabs for a page, in workbook order. */
export function sectionsFor(layer: Layer): readonly Section[] {
  return sectionsIndex.get(layer) ?? [];
}

export function sectionBySlug(layer: Layer, slug: string): Section | undefined {
  return sectionBySlugIndex.get(`${layer}::${slug}`);
}

/** The section an insight belongs to. */
export function sectionOf(insight: Insight): Section {
  const section = sectionBySlugIndex.get(`${insight.layer}::${slugify(insight.group)}`);
  if (!section) throw new Error(`Insight "${insight.id}" has no section for group "${insight.group}"`);
  return section;
}

/** Insights in one section, in workbook order. */
export function bySection(layer: Layer, slug: string): readonly Insight[] {
  return membersIndex.get(`${layer}::${slug}`) ?? [];
}

/**
 * Previous and next **within the section** (PRD §11.5). Does not wrap: the first
 * and last insight of a section return `undefined` on that side so the detail page
 * can disable the arrow. Single-insight sections return neither.
 */
export function prevNextInSection(id: string): { prev?: Insight; next?: Insight } {
  const insight = byId(id);
  const section = sectionOf(insight);
  const members = bySection(section.layer, section.slug);
  const position = members.findIndex((candidate) => candidate.id === id);

  const prev = position > 0 ? members[position - 1] : undefined;
  const next = position >= 0 && position < members.length - 1 ? members[position + 1] : undefined;

  return {
    ...(prev ? { prev } : {}),
    ...(next ? { next } : {}),
  };
}

export function demoPathInsights(): readonly Insight[] {
  return insights.filter((insight) => insight.demoPath);
}

/** Every panel in the catalogue, flattened. Used by the Phase 2 coverage gate. */
export function allPanels(): readonly { insight: Insight; panel: Panel; panelIndex: number }[] {
  return insights.flatMap((insight) =>
    insight.panels.map((panel, panelIndex) => ({ insight, panel, panelIndex })),
  );
}

export const totals = {
  insights: insights.length,
  panels: insights.reduce((sum, insight) => sum + insight.panels.length, 0),
  sections: LAYERS.reduce((sum, layer) => sum + sectionsFor(layer).length, 0),
  demoPath: insights.filter((insight) => insight.demoPath).length,
  twoPanel: insights.filter((insight) => insight.panels.length === 2).length,
} as const;
