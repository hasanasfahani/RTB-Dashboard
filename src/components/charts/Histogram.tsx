import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { DistributionData } from '../../types.ts';
import { chart, seriesColor, tokens } from '../../design/tokens.ts';
import { formatAxisTick, formatCount } from '../../design/format.ts';
import {
  CHART_ANIMATION,
  ChartFrame,
  ChartNote,
  SeriesLegend,
  TooltipShell,
  referenceMarks,
  valueAxis,
} from './common.tsx';

/**
 * Variants: `single`, `overlay`.
 *
 * `overlay` compares two populations — new book against existing — so the bars are
 * grouped rather than stacked: stacking would hide the shape of the second one.
 */
export function Histogram({ data, height, compact = false }: ChartProps) {
  const distribution = data.shape === 'distribution' ? (data as DistributionData) : undefined;
  const resolved = resolveHeight({ height, compact });

  if (!distribution || distribution.bins.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Histogram">{null}</ChartFrame>;
  }

  const rows = distribution.bins.map((bin) => {
    const row: Record<string, string | number> = {
      t: formatAxisTick(bin.from, distribution.unit),
      from: bin.from,
      to: bin.to,
    };
    distribution.seriesLabels.forEach((_, index) => {
      row[`s${index}`] = bin.counts[index] ?? 0;
    });
    return row;
  });

  const entries = distribution.seriesLabels.map((label, index) => ({
    key: `s${index}`,
    label,
    colour: seriesColor(index),
  }));

  return (
    <>
      {entries.length > 1 && <SeriesLegend className="mb-2" entries={entries} />}
      <ChartFrame height={resolved} isEmpty={false} label="Histogram">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barGap={1}>
            <CartesianGrid stroke={chart.grid} vertical={false} />
            <XAxis
              dataKey="t"
              tick={compact ? false : { fill: tokens.color.muted, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: chart.grid }}
              interval={compact ? 'preserveStartEnd' : 1}
            />
            {/* The y axis of a histogram is always a frequency, never the bin's unit. */}
            {valueAxis({ compact, unit: 'count' })}
            {referenceMarks(distribution.reference, { compact })}
            <Tooltip
              cursor={{ fill: chart.grid, fillOpacity: 0.4 }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as Record<string, number> | undefined;
                if (!active || !row) return null;
                return (
                  <TooltipShell
                    title={`${formatAxisTick(row.from ?? 0, distribution.unit)} – ${formatAxisTick(row.to ?? 0, distribution.unit)}`}
                    rows={entries.map((entry, index) => ({
                      label: entry.label,
                      value: formatCount(row[`s${index}`] ?? 0),
                      colour: entry.colour,
                    }))}
                  />
                );
              }}
            />
            {entries.map((entry, index) => (
              <Bar
                key={entry.key}
                dataKey={entry.key}
                name={entry.label}
                fill={seriesColor(index)}
                isAnimationActive={CHART_ANIMATION}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      {distribution.valueLabel && !compact && (
        <p className="mt-1 text-center text-micro text-muted">{distribution.valueLabel}</p>
      )}
      <ChartNote note={distribution.note} />
    </>
  );
}
