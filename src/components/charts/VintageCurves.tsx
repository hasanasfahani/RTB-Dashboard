import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { TimeSeriesData } from '../../types.ts';
import { chart, seriesColor, tokens } from '../../design/tokens.ts';
import {
  CHART_ANIMATION,
  ChartFrame,
  ChartNote,
  SeriesLegend,
  TooltipShell,
  payloadRows,
  valueAxis,
  type RechartsPayloadEntry,
} from './common.tsx';

/**
 * Variant: `plain`. R-45 — default rate by origination cohort.
 *
 * The x axis is months-on-book, not a date, which is the whole point of a vintage
 * chart: it puts cohorts of different ages on the same footing. Later cohorts are
 * shorter, so the series have different lengths and the rows are sparse.
 */
export function VintageCurves({ data, height, compact = false }: ChartProps) {
  const series = data.shape === 'timeSeries' ? (data as TimeSeriesData) : undefined;
  const resolved = resolveHeight({ height, compact });

  if (!series || series.series.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Vintage curves">{null}</ChartFrame>;
  }

  // The longest cohort defines the axis; shorter ones simply stop.
  const axis = series.series.reduce<string[]>((longest, entry) => {
    const labels = entry.points.map((point) => point.t);
    return labels.length > longest.length ? labels : longest;
  }, []);

  if (axis.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Vintage curves">{null}</ChartFrame>;
  }

  const rows = axis.map((label, index) => {
    const row: Record<string, string | number | null> = { t: label };
    for (const entry of series.series) {
      const point = entry.points[index];
      row[entry.key] = point ? point.v : null;
    }
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
      <ChartFrame height={resolved} isEmpty={false} label="Vintage curves">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: compact ? 0 : 14, left: 0 }}>
            <CartesianGrid stroke={chart.grid} vertical={false} />
            <XAxis
              dataKey="t"
              tick={compact ? false : { fill: tokens.color.muted, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: chart.grid }}
              interval={compact ? 'preserveStartEnd' : 2}
              {...(compact
                ? {}
                : {
                    label: {
                      value: 'Months on book',
                      position: 'insideBottom' as const,
                      offset: -6,
                      fill: tokens.color.muted,
                      fontSize: 9,
                    },
                  })}
            />
            {valueAxis({ compact, unit: series.unit })}
            <Tooltip
              content={({ active, payload, label }) =>
                active ? (
                  <TooltipShell
                    title={`Month ${String(label).replace('M', '')} on book`}
                    rows={payloadRows(payload as readonly RechartsPayloadEntry[], series.unit)}
                  />
                ) : null
              }
            />
            {series.series.map((entry, index) => (
              <Line
                key={entry.key}
                type="monotone"
                dataKey={entry.key}
                name={entry.label}
                stroke={seriesColor(index)}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={CHART_ANIMATION}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartNote note={series.note} />
    </>
  );
}
