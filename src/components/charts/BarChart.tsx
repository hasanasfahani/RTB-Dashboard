import { Bar, BarChart as RBarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { RankedData } from '../../types.ts';
import { chart, tokens } from '../../design/tokens.ts';
import { formatValueFull } from '../../design/format.ts';
import {
  CHART_ANIMATION,
  ChartFrame,
  ChartNote,
  TooltipShell,
  categoryAxis,
  referenceMarks,
  valueAxis,
} from './common.tsx';

/**
 * Variant: `plain`. (`withTarget` is in PRD §8 but unused by any panel — plan §2.4.)
 *
 * Ranked categories. Colour is deliberately uniform: PRD §8 forbids colouring a
 * neutral category red just because it is third in the list, and a ranked bar has no
 * threshold. Negative values — a P&L contribution can be negative — are the one
 * exception, and they take the muted ramp rather than red.
 */
export function BarChart({ data, height, compact = false }: ChartProps) {
  const ranked = data.shape === 'ranked' ? (data as RankedData) : undefined;
  const resolved = resolveHeight({ height, compact });

  if (!ranked || ranked.items.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Bar chart">{null}</ChartFrame>;
  }

  const rows = ranked.items.map((item) => ({ t: item.label, value: item.value }));
  const hasNegative = rows.some((row) => row.value < 0);

  return (
    <>
      <ChartFrame height={resolved} isEmpty={false} label="Bar chart">
        <ResponsiveContainer width="100%" height="100%">
          <RBarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chart.grid} vertical={false} />
            {categoryAxis({ compact, formatter: (value) => value, interval: 0, angled: rows.length > 5 })}
            {valueAxis({ compact, unit: ranked.unit })}
            {referenceMarks(ranked.reference, { compact })}
            <Tooltip
              cursor={{ fill: chart.grid, fillOpacity: 0.4 }}
              content={({ active, payload, label }) =>
                active && payload?.[0] ? (
                  <TooltipShell
                    title={String(label)}
                    rows={[
                      {
                        label: 'Value',
                        value: formatValueFull(Number(payload[0].value ?? 0), ranked.unit),
                      },
                    ]}
                  />
                ) : null
              }
            />
            <Bar dataKey="value" name="Value" isAnimationActive={CHART_ANIMATION}>
              {rows.map((row) => (
                <Cell
                  key={row.t}
                  fill={hasNegative && row.value < 0 ? tokens.series[2] : tokens.color.navy}
                />
              ))}
            </Bar>
          </RBarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartNote note={ranked.note} />
    </>
  );
}
