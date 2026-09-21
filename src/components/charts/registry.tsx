import { memo, useMemo } from 'react';
import type { ChartComponent, ChartData, ChartVariant, Filters } from '../../types.ts';
import { seriesFor } from '../../data/seriesFor.ts';
import { byId } from '../../data/insights.ts';
import { DEFAULT_FILTERS } from '../../data/filters.ts';
import { resolveHeight, type ChartProps, type ChartRegistry } from './contract.ts';
import { AreaChart } from './AreaChart.tsx';
import { BarChart } from './BarChart.tsx';
import { BoxPlot } from './BoxPlot.tsx';
import { BulletChart } from './BulletChart.tsx';
import { ComboChart } from './ComboChart.tsx';
import { DataTable } from './DataTable.tsx';
import { DonutChart } from './DonutChart.tsx';
import { FunnelChart } from './FunnelChart.tsx';
import { GaugeChart } from './GaugeChart.tsx';
import { GeoMap } from './GeoMap.tsx';
import { Heatmap } from './Heatmap.tsx';
import { Histogram } from './Histogram.tsx';
import { KpiCards } from './KpiCards.tsx';
import { LineChart } from './LineChart.tsx';
import { ParetoChart } from './ParetoChart.tsx';
import { RankedBar } from './RankedBar.tsx';
import { SankeyDiagram } from './SankeyDiagram.tsx';
import { ScatterPlot } from './ScatterPlot.tsx';
import { ScenarioBars } from './ScenarioBars.tsx';
import { StackedBar } from './StackedBar.tsx';
import { Treemap } from './Treemap.tsx';
import { VintageCurves } from './VintageCurves.tsx';
import { WaterfallChart } from './WaterfallChart.tsx';

/**
 * All 23 components, covering the catalogue's 39 variants.
 *
 * Phase 3 built the 8 the Executive layer needs — PRD §14's Phase 1 lists six, but
 * E-06 also needs `StackedBar` and E-08 also needs `BarChart` (plan §2.3). Phase 4
 * added the other 15. The registry is typed `Partial`, so `verify:tokens` is what
 * guarantees it is now complete rather than the type system.
 */
export const CHART_REGISTRY: ChartRegistry = {
  // Recharts
  KpiCards,
  LineChart,
  AreaChart,
  BarChart,
  RankedBar,
  StackedBar,
  ComboChart,
  DonutChart,
  ParetoChart,
  ScatterPlot,
  Histogram,
  VintageCurves,
  // Hand-rolled SVG (PRD §4)
  Treemap,
  FunnelChart,
  WaterfallChart,
  Heatmap,
  GaugeChart,
  BulletChart,
  SankeyDiagram,
  GeoMap,
  BoxPlot,
  ScenarioBars,
  DataTable,
};

export const IMPLEMENTED: readonly ChartComponent[] = Object.keys(CHART_REGISTRY) as ChartComponent[];

export function isImplemented(component: ChartComponent): boolean {
  return CHART_REGISTRY[component] !== undefined;
}

/**
 * Renders one chart from its data. Unknown components get a labelled placeholder —
 * visible in `/dev/gallery` through Phase 4, and forbidden anywhere by Phase 5 (PRD §13).
 */
export const Chart = memo(function Chart({
  component,
  data,
  variant,
  height,
  compact = false,
}: {
  component: ChartComponent;
  data: ChartData;
  variant: ChartVariant;
  height?: number;
  compact?: boolean;
}) {
  const Renderer = CHART_REGISTRY[component];
  const resolved = resolveHeight({ height, compact });

  if (!Renderer) {
    // Every component in the catalogue is registered, so this is unreachable in
    // practice. It stays as a visible failure rather than a blank card, because PRD §13
    // makes "every one of the 163 renders" the acceptance test that matters most.
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 rounded-card border border-dashed border-negative bg-canvas"
        style={{ height: resolved }}
      >
        <span className="text-label text-negative">{component}</span>
        <span className="text-micro text-muted">no renderer registered</span>
      </div>
    );
  }

  const props: ChartProps = {
    data,
    variant,
    compact,
    ...(height !== undefined ? { height } : {}),
  };
  /*
   * The wrapper carries what was rendered. PRD §13's acceptance test is that every
   * card's chart type matches its `panels` entry, and without this the only way to
   * check that in a browser is to guess from the shape of the SVG.
   */
  return (
    <div data-chart={component} data-variant={variant} data-shape={data.shape}>
      <Renderer {...props} />
    </div>
  );
});

/**
 * Renders one panel of one insight — the bridge from the catalogue to the chart
 * library. Data comes from `seriesFor`, so a panel always matches its `panels` entry.
 */
export const InsightPanel = memo(function InsightPanel({
  id,
  panelIndex = 0,
  filters = DEFAULT_FILTERS,
  height,
  compact = false,
}: {
  id: string;
  panelIndex?: number;
  filters?: Filters;
  height?: number;
  compact?: boolean;
}) {
  const insight = byId(id);
  const panel = insight.panels[panelIndex];

  /*
   * Generation is pure and deterministic, but it is not free: a page holds up to 78
   * panels, and recomputing every one of them on an unrelated re-render is what made
   * switching a section tab take a second. Keyed on everything `seriesFor` reads.
   */
  const data = useMemo(
    () => (panel ? seriesFor(id, panelIndex, filters) : undefined),
    [id, panelIndex, panel, filters],
  );

  if (!panel || !data) return null;

  return (
    <Chart
      component={panel.component}
      data={data}
      variant={panel.variant}
      compact={compact}
      {...(height !== undefined ? { height } : {})}
    />
  );
});
