import { useState } from 'react';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { BoxPlotGroup, DistributionData } from '../../types.ts';
import { chart, tokens } from '../../design/tokens.ts';
import { formatAxisTick, formatValueFull } from '../../design/format.ts';
import { ChartFrame, ChartNote, TooltipShell } from './common.tsx';

/**
 * Hand-rolled (PRD §4). Variant: `plain`.
 *
 * Five-number summary per group: whiskers to min and max, a box from Q1 to Q3, and the
 * median as a line inside it. The spread is the point, so the box is drawn in the
 * neutral ramp and only the median gets the primary colour.
 */
export function BoxPlot({ data, height, compact = false }: ChartProps) {
  const distribution = data.shape === 'distribution' ? (data as DistributionData) : undefined;
  const resolved = resolveHeight({ height, compact });
  const [hovered, setHovered] = useState<string | undefined>(undefined);

  if (!distribution || distribution.groups.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Box plot">{null}</ChartFrame>;
  }

  const groups = distribution.groups;
  const min = Math.min(...groups.map((group) => group.min));
  const max = Math.max(...groups.map((group) => group.max));
  const span = max - min || 1;

  const axisWidth = compact ? 0 : 56;
  const labelHeight = compact ? 4 : 30;
  const plotHeight = resolved - labelHeight;
  const slot = 100 / groups.length;
  const boxWidth = slot * 0.46;

  const y = (value: number): number => plotHeight - ((value - min) / span) * plotHeight;
  const hoveredGroup = groups.find((group) => group.key === hovered);

  return (
    <>
      <div className="relative" style={{ height: resolved }}>
        <div className="flex h-full">
          {!compact && (
            <div className="relative shrink-0" style={{ width: axisWidth, height: plotHeight }}>
              {[max, min + span / 2, min].map((tick) => (
                <span
                  key={tick}
                  className="absolute end-1 -translate-y-1/2 text-micro text-muted"
                  style={{ top: y(tick) }}
                >
                  {formatAxisTick(tick, distribution.unit)}
                </span>
              ))}
            </div>
          )}
          {/*
              * `min-w-0` on the plot column too: `flex-1` is `flex: 1 1 0%` but leaves
              * `min-width: auto`, so the column still refuses to shrink below its
              * content and pushes the page wider than the viewport at 1280px.
              */}
          <div className="relative min-w-0 flex-1">
            <svg width="100%" height={plotHeight} role="img" aria-label="Box plot">
              {groups.map((group, index) => {
                const centre = index * slot + slot / 2;
                const left = centre - boxWidth / 2;
                return (
                  <g
                    key={group.key}
                    onMouseEnter={() => setHovered(group.key)}
                    onMouseLeave={() => setHovered(undefined)}
                  >
                    {/* Whiskers */}
                    <line x1={`${centre}%`} x2={`${centre}%`} y1={y(group.max)} y2={y(group.q3)} stroke={chart.axis} />
                    <line x1={`${centre}%`} x2={`${centre}%`} y1={y(group.q1)} y2={y(group.min)} stroke={chart.axis} />
                    <line x1={`${centre - boxWidth / 4}%`} x2={`${centre + boxWidth / 4}%`} y1={y(group.max)} y2={y(group.max)} stroke={chart.axis} />
                    <line x1={`${centre - boxWidth / 4}%`} x2={`${centre + boxWidth / 4}%`} y1={y(group.min)} y2={y(group.min)} stroke={chart.axis} />
                    {/* Interquartile box */}
                    <rect
                      x={`${left}%`}
                      y={y(group.q3)}
                      width={`${boxWidth}%`}
                      height={Math.max(1, y(group.q1) - y(group.q3))}
                      fill={tokens.series[3]}
                      stroke={tokens.color.navy}
                      strokeWidth={1}
                      opacity={hovered === undefined || hovered === group.key ? 1 : 0.6}
                    />
                    {/* Median */}
                    <line
                      x1={`${left}%`}
                      x2={`${left + boxWidth}%`}
                      y1={y(group.median)}
                      y2={y(group.median)}
                      stroke={tokens.color.navy}
                      strokeWidth={2}
                    />
                  </g>
                );
              })}
            </svg>
            {!compact && (
              <div className="flex">
                {groups.map((group) => (
                  <span
                    key={group.key}
                    className="truncate px-0.5 text-center text-micro text-muted"
                    style={{ width: `${slot}%` }}
                    title={group.label}
                  >
                    {group.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {hoveredGroup && (
          <div className="pointer-events-none absolute start-1/2 top-0 z-10 -translate-x-1/2">
            <Summary group={hoveredGroup} unit={distribution.unit} />
          </div>
        )}
      </div>
      <ChartNote note={distribution.note} />
    </>
  );
}

function Summary({ group, unit }: { group: BoxPlotGroup; unit: DistributionData['unit'] }) {
  return (
    <TooltipShell
      title={group.label}
      rows={[
        { label: 'Max', value: formatValueFull(group.max, unit) },
        { label: 'Upper quartile', value: formatValueFull(group.q3, unit) },
        { label: 'Median', value: formatValueFull(group.median, unit) },
        { label: 'Lower quartile', value: formatValueFull(group.q1, unit) },
        { label: 'Min', value: formatValueFull(group.min, unit) },
      ]}
    />
  );
}
