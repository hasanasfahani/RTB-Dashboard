import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { RankedData } from '../../types.ts';
import { chart, tokens } from '../../design/tokens.ts';
import { formatAxisTick, formatValueFull } from '../../design/format.ts';
import { CHART_ANIMATION, ChartFrame, ChartNote, TooltipShell } from './common.tsx';

/**
 * Variant: `plain`. Horizontal bars — the layout that lets long category names read,
 * which is why the catalogue uses it where `BarChart` would wrap its labels.
 */
export function RankedBar({ data, height, compact = false }: ChartProps) {
  const ranked = data.shape === 'ranked' ? (data as RankedData) : undefined;
  const resolved = resolveHeight({ height, compact });

  if (!ranked || ranked.items.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Ranked bar">{null}</ChartFrame>;
  }

  const rows = ranked.items.map((item) => ({ t: item.label, value: item.value }));

  return (
    <>
      <ChartFrame height={resolved} isEmpty={false} label="Ranked bar">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chart.grid} horizontal={false} />
            <XAxis
              type="number"
              tick={compact ? false : { fill: tokens.color.muted, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: chart.grid }}
              tickFormatter={(value: number) => formatAxisTick(value, ranked.unit)}
            />
            <YAxis
              type="category"
              dataKey="t"
              tick={compact ? false : { fill: tokens.color.muted, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={compact ? 4 : 110}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: chart.grid, fillOpacity: 0.4 }}
              content={({ active, payload, label }) =>
                active && payload?.[0] ? (
                  <TooltipShell
                    title={String(label)}
                    rows={[{ label: 'Value', value: formatValueFull(Number(payload[0].value ?? 0), ranked.unit) }]}
                  />
                ) : null
              }
            />
            <Bar dataKey="value" name="Value" isAnimationActive={CHART_ANIMATION}>
              {rows.map((row) => (
                <Cell key={row.t} fill={tokens.color.navy} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartNote note={ranked.note} />
    </>
  );
}
