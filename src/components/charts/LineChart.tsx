import {
  CartesianGrid,
  Dot,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
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
 * Variants: `single`, `appetiteBand`, `peakMarkers`, `adoptionCurve`.
 *
 * `multi` appears in PRD §8 but no panel uses it (plan §2.4), so it is not built.
 * Multi-series line data still renders correctly — `ComboChart` shares this shape.
 */
export function LineChart({ data, variant, height, compact = false }: ChartProps) {
  const series = data.shape === 'timeSeries' ? (data as TimeSeriesData) : undefined;
  const resolved = resolveHeight({ height, compact });
  const points = series?.series[0]?.points ?? [];

  if (!series || series.series.length === 0 || points.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Line chart">{null}</ChartFrame>;
  }

  // Recharts wants one row per x value with a column per series.
  const rows = points.map((point, index) => {
    const row: Record<string, string | number> = { t: point.t };
    for (const entry of series.series) row[entry.key] = entry.points[index]?.v ?? 0;
    return row;
  });

  const peaks = variant === 'peakMarkers' ? peakIndexes(points.map((point) => point.v)) : new Set<number>();
  const singlePoint = points.length === 1;

  return (
    <>
      {series.series.length > 1 && (
        <SeriesLegend
          className="mb-2"
          entries={series.series.map((entry, index) => ({
            key: entry.key,
            label: entry.label,
            colour: seriesColor(index),
          }))}
        />
      )}
      <ChartFrame height={resolved} isEmpty={false} label={series.series[0]?.label}>
        <ResponsiveContainer width="100%" height="100%">
          <RLineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
              <Line
                key={entry.key}
                type="monotone"
                dataKey={entry.key}
                name={entry.label}
                stroke={seriesColor(index)}
                strokeWidth={2}
                // A single point has no line to draw, so it must show as a dot.
                dot={
                  singlePoint
                    ? { r: 3, fill: seriesColor(index) }
                    : variant === 'peakMarkers'
                      ? (dotProps: unknown) => {
                          /*
                           * Recharts puts `key` inside the props it hands a custom dot
                           * renderer, and spreading that into JSX is a React error
                           * (PRD §13: "Recharts is noisy about missing keys; fix them").
                           * Pull it out and pass it as a real key.
                           */
                          const { key, ...rest } = dotProps as PeakDotProps & { key?: string };
                          return (
                            <PeakDot
                              key={key ?? `peak-${rest.index ?? 0}`}
                              {...rest}
                              peaks={peaks}
                              colour={seriesColor(index)}
                            />
                          );
                        }
                      : false
                }
                activeDot={{ r: 3 }}
                isAnimationActive={CHART_ANIMATION}
              />
            ))}
          </RLineChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartNote note={series.note} />
    </>
  );
}

/** Local maxima, so `peakMarkers` marks the peaks rather than every point. */
function peakIndexes(values: readonly number[]): Set<number> {
  const peaks = new Set<number>();
  for (let index = 1; index < values.length - 1; index += 1) {
    const previous = values[index - 1] ?? 0;
    const current = values[index] ?? 0;
    const next = values[index + 1] ?? 0;
    if (current > previous && current >= next) peaks.add(index);
  }
  return peaks;
}

interface PeakDotProps {
  cx?: number | undefined;
  cy?: number | undefined;
  index?: number | undefined;
  peaks: Set<number>;
  colour: string;
}

function PeakDot({ cx, cy, index, peaks, colour }: PeakDotProps) {
  if (cx === undefined || cy === undefined || index === undefined || !peaks.has(index)) {
    return null;
  }
  return <Dot cx={cx} cy={cy} r={3} fill={colour} stroke={colour} />;
}
