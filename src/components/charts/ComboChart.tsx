import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { TimeSeriesData } from '../../types.ts';
import { chart, seriesColor } from '../../design/tokens.ts';
import { formatTimeLabel, formatTimeTick } from '../../design/format.ts';
import {
  CHART_ANIMATION,
  ChartFrame,
  ChartNote,
  SeriesLegend,
  TooltipShell,
  categoryAxis,
  payloadRows,
  referenceMarks,
  valueAxis,
  type RechartsPayloadEntry,
} from './common.tsx';

/**
 * Variants: `barsPlusLine`, `dualAxisLines`.
 *
 * The series carry their own `role` and `axis` from `seriesFor`, so this component
 * only has to honour them rather than re-derive which mark goes where.
 */
export function ComboChart({ data, variant, height, compact = false }: ChartProps) {
  const series = data.shape === 'timeSeries' ? (data as TimeSeriesData) : undefined;
  const resolved = resolveHeight({ height, compact });
  const points = series?.series[0]?.points ?? [];

  if (!series || series.series.length === 0 || points.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Combo chart">{null}</ChartFrame>;
  }

  const rows = points.map((point, index) => {
    const row: Record<string, string | number> = { t: point.t };
    for (const entry of series.series) row[entry.key] = entry.points[index]?.v ?? 0;
    return row;
  });

  const dual = variant === 'dualAxisLines';
  const entries = series.series.map((entry, index) => ({
    key: entry.key,
    label: entry.label + (dual && entry.axis === 'right' ? ' (right)' : ''),
    colour: seriesColor(index),
  }));

  return (
    <>
      <SeriesLegend className="mb-2" entries={entries} />
      <ChartFrame height={resolved} isEmpty={false} label="Combo chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chart.grid} vertical={false} />
            {categoryAxis({ compact, formatter: (value) => formatTimeTick(value, series.axisKind) })}
            {valueAxis({ compact, unit: series.unit })}
            {dual && valueAxis({ compact, unit: series.unit, orientation: 'right', width: 48 })}
            {referenceMarks(series.reference, { compact })}
            <Tooltip
              cursor={{ fill: chart.grid, fillOpacity: 0.4 }}
              content={({ active, payload, label }) =>
                active ? (
                  <TooltipShell
                    title={formatTimeLabel(String(label), series.axisKind)}
                    rows={payloadRows(payload as readonly RechartsPayloadEntry[], series.unit)}
                  />
                ) : null
              }
            />
            {series.series.map((entry, index) => {
              const onRight = dual && entry.axis === 'right';
              const axisProps = onRight ? { yAxisId: 'right' as const } : {};
              return entry.role === 'bar' ? (
                <Bar
                  key={entry.key}
                  dataKey={entry.key}
                  name={entry.label}
                  fill={seriesColor(index)}
                  isAnimationActive={CHART_ANIMATION}
                  {...axisProps}
                />
              ) : (
                <Line
                  key={entry.key}
                  type="monotone"
                  dataKey={entry.key}
                  name={entry.label}
                  stroke={seriesColor(index)}
                  strokeWidth={2}
                  dot={points.length === 1 ? { r: 3, fill: seriesColor(index) } : false}
                  isAnimationActive={CHART_ANIMATION}
                  {...axisProps}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartNote note={series.note} />
    </>
  );
}
