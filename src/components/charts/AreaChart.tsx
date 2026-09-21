import { Area, AreaChart as RAreaChart, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
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

/** Variants: `single`, `stacked`. */
export function AreaChart({ data, variant, height, compact = false }: ChartProps) {
  const series = data.shape === 'timeSeries' ? (data as TimeSeriesData) : undefined;
  const resolved = resolveHeight({ height, compact });
  const points = series?.series[0]?.points ?? [];

  if (!series || series.series.length === 0 || points.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Area chart">{null}</ChartFrame>;
  }

  const rows = points.map((point, index) => {
    const row: Record<string, string | number> = { t: point.t };
    for (const entry of series.series) row[entry.key] = entry.points[index]?.v ?? 0;
    return row;
  });

  const stacked = variant === 'stacked' || series.stacked === true;
  const entries = series.series.map((entry, index) => ({
    key: entry.key,
    label: entry.label,
    colour: seriesColor(index),
  }));

  return (
    <>
      {series.series.length > 1 && <SeriesLegend className="mb-2" entries={entries} />}
      <ChartFrame height={resolved} isEmpty={false} label="Area chart">
        <ResponsiveContainer width="100%" height="100%">
          <RAreaChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chart.grid} vertical={false} />
            {categoryAxis({ compact, formatter: (value) => formatTimeTick(value, series.axisKind) })}
            {valueAxis({ compact, unit: series.unit })}
            {referenceMarks(series.reference, { compact })}
            <Tooltip
              content={({ active, payload, label }) =>
                active ? (
                  <TooltipShell
                    title={formatTimeLabel(String(label), series.axisKind)}
                    rows={payloadRows(payload as readonly RechartsPayloadEntry[], series.unit)}
                  />
                ) : null
              }
            />
            {series.series.map((entry, index) => (
              <Area
                key={entry.key}
                type="monotone"
                dataKey={entry.key}
                name={entry.label}
                {...(stacked ? { stackId: 'stack' } : {})}
                stroke={seriesColor(index)}
                strokeWidth={1.5}
                fill={seriesColor(index)}
                fillOpacity={stacked ? 0.9 : 0.18}
                isAnimationActive={CHART_ANIMATION}
                dot={points.length === 1 ? { r: 3, fill: seriesColor(index) } : false}
              />
            ))}
          </RAreaChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartNote note={series.note} />
    </>
  );
}
