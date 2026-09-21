import { useMemo, useState } from 'react';
import { PageBody } from '../components/layout/AppShell.tsx';
import { Chart, isImplemented } from '../components/charts/registry.tsx';
import { COMPACT_CHART_HEIGHT, DEFAULT_CHART_HEIGHT } from '../components/charts/contract.ts';
import { IdChip } from '../components/ui/Badge.tsx';
import { VARIANTS_BY_COMPONENT, type ChartComponent, type ChartData, type ChartVariant } from '../types.ts';
import { allPanels } from '../data/insights.ts';
import { DEFAULT_FILTERS } from '../data/filters.ts';
import { seriesFor } from '../data/seriesFor.ts';

/**
 * `/dev/gallery` — every component and variant on one page, at full and compact size.
 *
 * PRD §14 says build this before the chart library, and it is right: it is the only
 * practical way to see 23 components x 39 variants without clicking through 163 cards,
 * and it is where the empty / single-point / 160px-compact cases get exercised.
 *
 * Not linked from the main navigation. It is a development surface, not a demo screen.
 */

interface Example {
  readonly component: ChartComponent;
  readonly variant: ChartVariant;
  readonly insightId: string;
  readonly panelIndex: number;
}

/** First real panel in the catalogue for each (component, variant) pair. */
function collectExamples(): readonly Example[] {
  const seen = new Set<string>();
  const examples: Example[] = [];
  for (const { insight, panel, panelIndex } of allPanels()) {
    const key = `${panel.component}:${panel.variant}`;
    if (seen.has(key)) continue;
    seen.add(key);
    examples.push({
      component: panel.component,
      variant: panel.variant,
      insightId: insight.id,
      panelIndex,
    });
  }
  return examples;
}

type EdgeCase = 'none' | 'empty' | 'single';

export function DevGallery() {
  const [compact, setCompact] = useState(false);
  const [edgeCase, setEdgeCase] = useState<EdgeCase>('none');
  const [onlyImplemented, setOnlyImplemented] = useState(true);

  const examples = useMemo(collectExamples, []);
  const shown = onlyImplemented ? examples.filter((e) => isImplemented(e.component)) : examples;

  const componentCount = new Set(shown.map((e) => e.component)).size;
  const declaredPairs = (Object.keys(VARIANTS_BY_COMPONENT) as ChartComponent[]).reduce(
    (sum, component) => sum + VARIANTS_BY_COMPONENT[component].length,
    0,
  );

  return (
    <PageBody>
      <header className="mb-6">
        <p className="text-label text-accent">Development surface</p>
        <h2 className="mt-1 text-h1 text-navy">Chart gallery</h2>
        <p className="mt-1 text-body text-muted">
          {shown.length} of {declaredPairs} variants across {componentCount} components. Every
          example is a real panel from the catalogue, rendered through `seriesFor`.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Toggle label="Compact (160px)" checked={compact} onChange={setCompact} />
          <Toggle
            label="Implemented only"
            checked={onlyImplemented}
            onChange={setOnlyImplemented}
          />
          <label className="flex items-center gap-2 text-micro text-muted">
            <span className="text-label">Edge case</span>
            <select
              value={edgeCase}
              onChange={(event) => setEdgeCase(event.target.value as EdgeCase)}
              className="rounded-chip border border-line bg-surface px-2 py-1 text-micro text-ink"
            >
              <option value="none">Real data</option>
              <option value="empty">Empty dataset</option>
              <option value="single">Single data point</option>
            </select>
          </label>
        </div>
      </header>

      <div className={`grid gap-4 ${compact ? 'xl:grid-cols-3 lg:grid-cols-2' : 'xl:grid-cols-2'}`}>
        {shown.map((example) => (
          <GalleryCell key={`${example.component}:${example.variant}`} example={example} compact={compact} edgeCase={edgeCase} />
        ))}
      </div>
    </PageBody>
  );
}

function GalleryCell({
  example,
  compact,
  edgeCase,
}: {
  example: Example;
  compact: boolean;
  edgeCase: EdgeCase;
}) {
  const data = useMemo(() => {
    const real = seriesFor(example.insightId, example.panelIndex, DEFAULT_FILTERS);
    return edgeCase === 'none' ? real : degrade(real, edgeCase);
  }, [example.insightId, example.panelIndex, edgeCase]);

  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-h2 text-navy">
          {example.component}
          <span className="ms-1.5 text-micro font-normal text-muted">{example.variant}</span>
        </h3>
        <span className="flex items-center gap-1.5 text-micro text-muted">
          <IdChip id={example.insightId} />p{example.panelIndex}
        </span>
      </header>
      <Chart
        component={example.component}
        data={data}
        variant={example.variant}
        compact={compact}
        height={compact ? COMPACT_CHART_HEIGHT : DEFAULT_CHART_HEIGHT}
      />
    </section>
  );
}

/**
 * Cuts real data down to the two cases PRD §8 requires every chart to survive.
 *
 * Done here rather than with hand-written fixtures so the degraded case is provably the
 * same shape the chart will actually receive.
 */
export function degrade(data: ChartData, edgeCase: 'empty' | 'single'): ChartData {
  const keep = edgeCase === 'single' ? 1 : 0;

  switch (data.shape) {
    case 'timeSeries':
      return {
        ...data,
        series: data.series.slice(0, Math.max(keep, 0)).map((series) => ({
          ...series,
          points: series.points.slice(0, keep),
        })),
      };
    case 'breakdown':
      return { ...data, slices: data.slices.slice(0, keep) };
    case 'ranked':
      return { ...data, items: data.items.slice(0, keep) };
    case 'matrix':
      return {
        ...data,
        rows: data.rows.slice(0, keep),
        cols: data.cols.slice(0, keep),
        cells: data.cells.slice(0, keep),
      };
    case 'funnelSteps':
      return { ...data, steps: data.steps.slice(0, keep) };
    case 'distribution':
      return { ...data, bins: data.bins.slice(0, keep), groups: data.groups.slice(0, keep) };
    case 'flows':
      return { ...data, nodes: data.nodes.slice(0, keep), links: data.links.slice(0, keep) };
    case 'scatterPoints':
      return { ...data, points: data.points.slice(0, keep) };
    case 'gaugeSet':
      return { ...data, gauges: data.gauges.slice(0, keep) };
    case 'bulletRows':
      return { ...data, rows: data.rows.slice(0, keep) };
    case 'tableRows':
      return { ...data, rows: data.rows.slice(0, keep) };
    case 'waterfallSteps':
      return { ...data, steps: data.steps.slice(0, keep) };
    case 'geoPoints':
      return { ...data, points: data.points.slice(0, keep) };
    case 'kpiSet':
      return { ...data, cards: data.cards.slice(0, keep) };
    case 'scenarioSet':
      return { ...data, scenarios: data.scenarios.slice(0, keep) };
    default:
      return data;
  }
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-micro text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 accent-cyan"
      />
      <span className="text-label">{label}</span>
    </label>
  );
}
