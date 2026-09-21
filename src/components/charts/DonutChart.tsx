import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { BreakdownData } from '../../types.ts';
import { seriesColor } from '../../design/tokens.ts';
import { formatPercent, formatValue, formatValueFull } from '../../design/format.ts';
import { CHART_ANIMATION, ChartFrame, ChartNote, SeriesLegend, TooltipShell } from './common.tsx';

/** Variant: `plain`. A composition, with the total in the middle. */
export function DonutChart({ data, height, compact = false }: ChartProps) {
  const breakdown = data.shape === 'breakdown' ? (data as BreakdownData) : undefined;
  const resolved = resolveHeight({ height, compact });

  if (!breakdown || breakdown.slices.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Donut chart">{null}</ChartFrame>;
  }

  const total = breakdown.total || breakdown.slices.reduce((sum, slice) => sum + slice.value, 0);
  const entries = breakdown.slices.map((slice, index) => ({
    key: slice.key,
    label: slice.label,
    colour: seriesColor(index),
  }));

  const thickness = compact ? 14 : 22;
  const outer = Math.max(24, resolved / 2 - (compact ? 6 : 18));

  return (
    <>
      {/*
        * `flex-wrap`: the donut has a fixed pixel size and the legend has an
        * intrinsic one, so in a half-width two-panel card neither could shrink and
        * the pair pushed the page past 1280px. Wrapping puts the legend underneath
        * when the row will not fit, which stays readable either way.
        */}
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <ChartFrame height={resolved} isEmpty={false} label="Donut chart">
          <div className="relative" style={{ height: resolved, width: resolved }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown.slices.map((slice) => ({ ...slice }))}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={Math.max(12, outer - thickness)}
                  outerRadius={outer}
                  paddingAngle={1}
                  stroke="none"
                  isAnimationActive={CHART_ANIMATION}
                >
                  {breakdown.slices.map((slice, index) => (
                    <Cell key={slice.key} fill={seriesColor(index)} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    const entry = payload?.[0];
                    if (!active || !entry) return null;
                    const value = Number(entry.value ?? 0);
                    return (
                      <TooltipShell
                        title={String(entry.name ?? '')}
                        rows={[
                          { label: 'Value', value: formatValueFull(value, breakdown.unit) },
                          {
                            label: 'Share',
                            value: total > 0 ? formatPercent((value / total) * 100) : '—',
                          },
                        ]}
                      />
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* The total belongs in the hole, not in a legend. */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-label text-muted">Total</span>
              <span className="text-h2 text-navy">{formatValue(total, breakdown.unit, { compact: true })}</span>
            </div>
          </div>
        </ChartFrame>
        {!compact && <SeriesLegend className="min-w-0 flex-col items-start" entries={entries} />}
      </div>
      <ChartNote note={breakdown.note} />
    </>
  );
}
