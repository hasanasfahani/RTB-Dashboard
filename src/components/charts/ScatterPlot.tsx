import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { ScatterData } from '../../types.ts';
import { chart, tokens } from '../../design/tokens.ts';
import { formatAxisTick, formatValueFull } from '../../design/format.ts';
import { CHART_ANIMATION, ChartFrame, ChartNote, DASH_TARGET, TooltipShell } from './common.tsx';

/**
 * Variants: `plain`, `quadrant`, `breakEven`.
 *
 * `quadrant` splits on the means so each corner reads as a segment; `breakEven` adds
 * the y = x diagonal, where above the line is profitable and below is not.
 */
export function ScatterPlot({ data, variant, height, compact = false }: ChartProps) {
  const scatter = data.shape === 'scatterPoints' ? (data as ScatterData) : undefined;
  const resolved = resolveHeight({ height, compact });

  if (!scatter || scatter.points.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Scatter plot">{null}</ChartFrame>;
  }

  const rows = scatter.points.map((point) => ({ ...point }));
  const maxX = Math.max(...rows.map((row) => row.x));
  const maxY = Math.max(...rows.map((row) => row.y));
  const diagonalMax = Math.min(maxX, maxY);

  return (
    <>
      <ChartFrame height={resolved} isEmpty={false} label="Scatter plot">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: compact ? 0 : 16, left: 0 }}>
            <CartesianGrid stroke={chart.grid} />
            <XAxis
              type="number"
              dataKey="x"
              name={scatter.xLabel}
              tick={compact ? false : { fill: tokens.color.muted, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: chart.grid }}
              tickFormatter={(value: number) => formatAxisTick(value, scatter.unit)}
              {...(compact
                ? {}
                : {
                    label: {
                      value: scatter.xLabel,
                      position: 'insideBottom' as const,
                      offset: -8,
                      fill: tokens.color.muted,
                      fontSize: 9,
                    },
                  })}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={scatter.yLabel}
              tick={compact ? false : { fill: tokens.color.muted, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={compact ? 4 : 56}
              tickFormatter={(value: number) => formatAxisTick(value, scatter.unit)}
            />
            <ZAxis type="number" dataKey="size" range={[24, 180]} />

            {scatter.quadrantX !== undefined && variant === 'quadrant' && (
              <ReferenceLine x={scatter.quadrantX} stroke={chart.target} strokeDasharray={DASH_TARGET} />
            )}
            {scatter.quadrantY !== undefined && variant === 'quadrant' && (
              <ReferenceLine y={scatter.quadrantY} stroke={chart.target} strokeDasharray={DASH_TARGET} />
            )}
            {variant === 'breakEven' && (
              <ReferenceLine
                segment={[
                  { x: 0, y: 0 },
                  { x: diagonalMax, y: diagonalMax },
                ]}
                stroke={chart.target}
                strokeDasharray={DASH_TARGET}
                label={{ value: 'Break even', position: 'insideTopRight', fill: tokens.color.muted, fontSize: 9 }}
              />
            )}

            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as ScatterData['points'][number] | undefined;
                if (!active || !point) return null;
                return (
                  <TooltipShell
                    title={point.label}
                    rows={[
                      { label: scatter.xLabel, value: formatValueFull(point.x, scatter.unit) },
                      { label: scatter.yLabel, value: formatValueFull(point.y, scatter.unit) },
                    ]}
                  />
                );
              }}
            />
            <Scatter
              data={rows}
              name="Points"
              fill={tokens.color.navy}
              fillOpacity={0.7}
              isAnimationActive={CHART_ANIMATION}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartNote note={scatter.note} />
    </>
  );
}
