import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from 'recharts';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { RankedData } from '../../types.ts';
import { chart, tokens } from '../../design/tokens.ts';
import { formatCount, formatPercent, formatValueFull } from '../../design/format.ts';
import {
  CHART_ANIMATION,
  ChartFrame,
  ChartNote,
  DASH_TARGET,
  SeriesLegend,
  TooltipShell,
  categoryAxis,
  valueAxis,
} from './common.tsx';

/**
 * Variants: `plain`, `lorenz`. (`withLimit` is in PRD §8 but unused — plan §2.4.)
 *
 * `plain` is bars plus a cumulative line on a right-hand percentage axis. `lorenz` is
 * the concentration curve — R-17, demo beat 5 — drawn against the line of perfect
 * equality so the gap between them *is* the finding.
 */
export function ParetoChart(props: ChartProps) {
  const ranked = props.data.shape === 'ranked' ? (props.data as RankedData) : undefined;
  const resolved = resolveHeight({ height: props.height, compact: props.compact });

  if (!ranked || ranked.items.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Pareto chart">{null}</ChartFrame>;
  }
  return ranked.lorenz ? <Lorenz {...props} ranked={ranked} /> : <Pareto {...props} ranked={ranked} />;
}

function Pareto({ ranked, height, compact = false }: ChartProps & { ranked: RankedData }) {
  const resolved = resolveHeight({ height, compact });
  const rows = ranked.items.map((item) => ({
    t: item.label,
    value: item.value,
    cumulative: item.cumulativePct,
  }));

  return (
    <>
      <SeriesLegend
        className="mb-2"
        entries={[
          { key: 'value', label: 'Value', colour: tokens.color.navy },
          { key: 'cumulative', label: 'Cumulative share (right)', colour: tokens.color.cyan },
        ]}
      />
      <ChartFrame height={resolved} isEmpty={false} label="Pareto chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chart.grid} vertical={false} />
            {categoryAxis({ compact, formatter: (value) => value, interval: 0, angled: rows.length > 5 })}
            {valueAxis({ compact, unit: ranked.unit })}
            <YAxis
              yAxisId="cumulative"
              orientation="right"
              domain={[0, 100]}
              tick={compact ? false : { fill: tokens.color.muted, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={compact ? 4 : 40}
              tickFormatter={(value: number) => `${value}%`}
            />
            {/* The 80% line is what makes it a Pareto chart rather than a ranked bar. */}
            <ReferenceLine
              yAxisId="cumulative"
              y={80}
              stroke={chart.target}
              strokeDasharray={DASH_TARGET}
              label={{ value: '80%', position: 'insideTopRight', fill: tokens.color.muted, fontSize: 9 }}
            />
            <Tooltip
              cursor={{ fill: chart.grid, fillOpacity: 0.4 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const value = payload.find((entry) => entry.dataKey === 'value')?.value;
                const cumulative = payload.find((entry) => entry.dataKey === 'cumulative')?.value;
                return (
                  <TooltipShell
                    title={String(label)}
                    rows={[
                      { label: 'Value', value: formatValueFull(Number(value ?? 0), ranked.unit) },
                      { label: 'Cumulative', value: formatPercent(Number(cumulative ?? 0)) },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="value" name="Value" fill={tokens.color.navy} isAnimationActive={CHART_ANIMATION} />
            <Line
              yAxisId="cumulative"
              type="monotone"
              dataKey="cumulative"
              name="Cumulative"
              stroke={tokens.color.cyan}
              strokeWidth={2}
              dot={false}
              isAnimationActive={CHART_ANIMATION}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartNote note={ranked.note} />
    </>
  );
}

/**
 * The Lorenz curve. The x axis is the share of the customer base, not a category, so
 * the diagonal is the line of perfect equality and the area between the curve and the
 * diagonal is the concentration.
 */
function Lorenz({ ranked, height, compact = false }: ChartProps & { ranked: RankedData }) {
  // No transition: the curve is a `polyline`, and its `points` attribute cannot be
  // transitioned in CSS. It snaps, like the other hand-rolled SVG charts.
  const resolved = resolveHeight({ height, compact });

  // Percentile labels come back as "Top 5%"; recover the number for the x position.
  const points = ranked.items.map((item) => ({
    x: Number(item.label.replace(/[^0-9.]/g, '')),
    y: item.cumulativePct,
    label: item.label,
  }));
  const withOrigin = [{ x: 0, y: 0, label: '0%' }, ...points];

  const width = 100;
  const plot = resolved - (compact ? 8 : 26);
  const px = (x: number): number => (x / width) * 100;
  const py = (y: number): number => plot - (y / 100) * plot;

  const curve = withOrigin.map((point) => `${px(point.x)},${py(point.y)}`).join(' ');

  const anchors = ranked.reference ?? [];

  return (
    <>
      <SeriesLegend
        className="mb-2"
        entries={[
          { key: 'curve', label: 'Deposit share', colour: tokens.color.navy },
          { key: 'equality', label: 'Perfect equality', colour: tokens.color.muted },
        ]}
      />
      <div style={{ height: resolved }} className="relative">
        <svg
          width="100%"
          height={plot}
          viewBox={`0 0 100 ${plot}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Lorenz curve of deposit concentration"
        >
          {/* Line of perfect equality — dashed, because it is a reference (PRD §8). */}
          <line
            x1={0}
            y1={py(0)}
            x2={100}
            y2={py(100)}
            stroke={chart.target}
            strokeDasharray="2 2"
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          />
          <polygon points={`0,${py(0)} ${curve} 100,${py(100)}`} fill={tokens.color.cyan} opacity={0.12} />
          <polyline
            points={curve}
            fill="none"
            stroke={tokens.color.navy}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {anchors.map((reference) => {
            const match = points.find((point) => Math.abs(point.y - reference.value) < 0.5);
            if (!match) return null;
            return (
              <circle
                key={reference.label}
                cx={px(match.x)}
                cy={py(match.y)}
                r={2}
                fill={tokens.color.cyan}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        {!compact && (
          <>
            <div className="flex justify-between text-micro text-muted">
              <span>
                0% of {ranked.basis ? formatCount(ranked.basis.value) : ''} {ranked.basis?.label ?? 'customers'}
              </span>
              <span>100%</span>
            </div>
            {/* The two anchors are the finding, so they are labelled on the plot. */}
            <ul className="pointer-events-none absolute start-2 top-1 space-y-0.5">
              {anchors.map((reference) => (
                <li key={reference.label} className="text-micro font-bold text-navy">
                  {reference.label}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <ChartNote note={ranked.note} />
    </>
  );
}
