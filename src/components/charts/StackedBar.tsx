import { Bar, BarChart as RBarChart, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { BreakdownData, TimeSeriesData } from '../../types.ts';
import { chart, seriesColor } from '../../design/tokens.ts';
import { formatTimeLabel, formatTimeTick, formatValueFull } from '../../design/format.ts';
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
 * Variants: `absolute`, `percent` and `ladder`.
 *
 * `absolute` and `percent` are categories stacked over time. `ladder` is a bucket
 * breakdown, not a time series (plan §2.11), so it arrives as `breakdown` data and is
 * rendered by its own branch.
 */
export function StackedBar(props: ChartProps) {
  if (props.data.shape === 'breakdown') return <LadderBars {...props} />;
  return <TimeStack {...props} />;
}

function TimeStack({ data, height, compact = false }: ChartProps) {
  const series = data.shape === 'timeSeries' ? (data as TimeSeriesData) : undefined;
  const resolved = resolveHeight({ height, compact });
  const points = series?.series[0]?.points ?? [];

  if (!series || series.series.length === 0 || points.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Stacked bar">{null}</ChartFrame>;
  }

  const rows = points.map((point, index) => {
    const row: Record<string, string | number> = { t: point.t };
    for (const entry of series.series) row[entry.key] = entry.points[index]?.v ?? 0;
    return row;
  });

  const entries = series.series.map((entry, index) => ({
    key: entry.key,
    label: entry.label,
    colour: seriesColor(index),
  }));

  return (
    <>
      <SeriesLegend className="mb-2" entries={entries} />
      <ChartFrame height={resolved} isEmpty={false} label="Stacked bar">
        <ResponsiveContainer width="100%" height="100%">
          <RBarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chart.grid} vertical={false} />
            {categoryAxis({ compact, formatter: (value) => formatTimeTick(value, series.axisKind) })}
            {valueAxis({
              compact,
              unit: series.unit,
              ...(series.normalised ? { domain: [0, 100] as [number, number] } : {}),
            })}
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
            {series.series.map((entry, index) => (
              <Bar
                key={entry.key}
                dataKey={entry.key}
                name={entry.label}
                stackId="stack"
                fill={seriesColor(index)}
                isAnimationActive={CHART_ANIMATION}
              />
            ))}
          </RBarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartNote note={series.note} />
    </>
  );
}

/** `ladder` — maturity, repricing, rate and collateral buckets, each itself stacked. */
function LadderBars({ data, height, compact = false }: ChartProps) {
  const breakdown = data as BreakdownData;
  const resolved = resolveHeight({ height, compact });

  if (breakdown.slices.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Maturity ladder">{null}</ChartFrame>;
  }

  const partKeys = breakdown.slices[0]?.parts?.map((part) => part.key) ?? [];
  const partLabels = new Map(breakdown.slices[0]?.parts?.map((part) => [part.key, part.label]) ?? []);

  const rows = breakdown.slices.map((slice) => {
    const row: Record<string, string | number> = { t: slice.label };
    if (slice.parts && slice.parts.length > 0) {
      for (const part of slice.parts) row[part.key] = part.value;
    } else {
      row.value = slice.value;
    }
    return row;
  });

  const keys = partKeys.length > 0 ? partKeys : ['value'];
  const entries = keys.map((key, index) => ({
    key,
    label: partLabels.get(key) ?? breakdown.bucketLabel ?? 'Value',
    colour: seriesColor(index),
  }));

  return (
    <>
      {partKeys.length > 0 && <SeriesLegend className="mb-2" entries={entries} />}
      <ChartFrame height={resolved} isEmpty={false} label="Maturity ladder">
        <ResponsiveContainer width="100%" height="100%">
          <RBarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chart.grid} vertical={false} />
            {categoryAxis({ compact, formatter: (value) => value, interval: 0 })}
            {valueAxis({ compact, unit: breakdown.unit })}
            {referenceMarks(breakdown.reference, { compact })}
            <Tooltip
              cursor={{ fill: chart.grid, fillOpacity: 0.4 }}
              content={({ active, payload, label }) =>
                active ? (
                  <TooltipShell
                    title={`${breakdown.bucketLabel ?? 'Bucket'}: ${String(label)}`}
                    rows={payloadRows(payload as readonly RechartsPayloadEntry[], breakdown.unit)}
                  />
                ) : null
              }
            />
            {keys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                name={entries[index]?.label ?? key}
                stackId="ladder"
                fill={seriesColor(index)}
                isAnimationActive={CHART_ANIMATION}
              />
            ))}
          </RBarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <p className="mt-2 text-micro text-muted">
        Total {formatValueFull(breakdown.total, breakdown.unit)}
      </p>
      <ChartNote note={breakdown.note} />
    </>
  );
}
