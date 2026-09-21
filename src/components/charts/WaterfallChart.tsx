import { useState } from 'react';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { WaterfallData, WaterfallStep } from '../../types.ts';
import { chart, tokens } from '../../design/tokens.ts';
import { formatAxisTick, formatValueFull } from '../../design/format.ts';
import { ChartFrame, ChartNote, TooltipShell } from './common.tsx';

interface Placed {
  readonly step: WaterfallStep;
  readonly from: number;
  readonly to: number;
}

/**
 * Hand-rolled SVG (PRD §4). Variant: `plain`.
 *
 * Colour note: anchors (start, total) are navy, increases cyan, decreases mid-navy —
 * **not** red. In a P&L bridge a negative step is an operating expense or a tax
 * charge: expected, not bad. PRD §8 forbids colouring a neutral category red, and a
 * bridge has no threshold.
 */
export function WaterfallChart({ data, height, compact = false }: ChartProps) {
  const waterfall = data.shape === 'waterfallSteps' ? (data as WaterfallData) : undefined;
  const resolved = resolveHeight({ height, compact });
  const [hovered, setHovered] = useState<number | undefined>(undefined);

  if (!waterfall || waterfall.steps.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Waterfall">{null}</ChartFrame>;
  }

  // Walk the steps to find each bar's span.
  const placed: Placed[] = [];
  let running = 0;
  for (const step of waterfall.steps) {
    if (step.kind === 'start') {
      placed.push({ step, from: 0, to: step.value });
      running = step.value;
    } else if (step.kind === 'total') {
      placed.push({ step, from: 0, to: step.value });
    } else {
      placed.push({ step, from: running, to: running + step.value });
      running += step.value;
    }
  }

  const lows = placed.map((entry) => Math.min(entry.from, entry.to));
  const highs = placed.map((entry) => Math.max(entry.from, entry.to));
  const min = Math.min(0, ...lows);
  const max = Math.max(...highs, 0);
  const span = max - min || 1;

  const axisWidth = compact ? 0 : 56;
  const labelHeight = compact ? 4 : 34;
  const plotHeight = resolved - labelHeight;
  const gap = 0.24;
  const slot = 100 / placed.length;
  const barWidth = slot * (1 - gap);

  const y = (value: number): number => plotHeight - ((value - min) / span) * plotHeight;

  const colourFor = (step: WaterfallStep): string => {
    if (step.kind !== 'delta') return tokens.color.navy;
    return step.value >= 0 ? tokens.color.cyan : tokens.series[2];
  };

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
                  {formatAxisTick(tick, waterfall.unit)}
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
            <svg width="100%" height={plotHeight} role="img" aria-label="Waterfall">
              {/* Zero line, so a negative step reads correctly. */}
              <line x1="0" x2="100%" y1={y(0)} y2={y(0)} stroke={chart.grid} strokeWidth={1} />
              {placed.map((entry, index) => {
                const top = Math.min(y(entry.from), y(entry.to));
                const barHeight = Math.max(1, Math.abs(y(entry.to) - y(entry.from)));
                const x = index * slot + (slot - barWidth) / 2;
                const previous = placed[index - 1];
                return (
                  <g key={entry.step.key}>
                    {/* Connector from the previous bar's landing point. */}
                    {previous && entry.step.kind === 'delta' && (
                      <line
                        x1={`${(index - 1) * slot + (slot - barWidth) / 2 + barWidth}%`}
                        x2={`${x}%`}
                        y1={y(previous.to)}
                        y2={y(previous.to)}
                        stroke={chart.grid}
                        strokeDasharray="2 2"
                      />
                    )}
                    <rect
                      x={`${x}%`}
                      y={top}
                      width={`${barWidth}%`}
                      height={barHeight}
                      fill={colourFor(entry.step)}
                      opacity={hovered === undefined || hovered === index ? 1 : 0.55}
                      onMouseEnter={() => setHovered(index)}
                      onMouseLeave={() => setHovered(undefined)}
                    />
                  </g>
                );
              })}
            </svg>
            {!compact && (
              <div className="flex">
                {placed.map((entry, index) => (
                  <span
                    key={entry.step.key}
                    /*
                     * `min-w-0` matters: a flex item defaults to `min-width: auto` and
                     * so refuses to shrink below its content, and a label like
                     * "Net interest income" then pushed the row — and the whole page —
                     * wider than the viewport at 1280px. `overflow-hidden` also resets
                     * that automatic minimum, and keeps a long label inside its column.
                     */
                    className="min-w-0 overflow-hidden px-0.5 text-center text-micro leading-tight text-muted"
                    style={{ width: `${slot}%` }}
                    title={entry.step.label}
                    onMouseEnter={() => setHovered(index)}
                    onMouseLeave={() => setHovered(undefined)}
                  >
                    {entry.step.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {hovered !== undefined && placed[hovered] && (
          <div className="pointer-events-none absolute start-1/2 top-0 -translate-x-1/2">
            <TooltipShell
              title={placed[hovered].step.label}
              rows={[{ label: 'Amount', value: formatValueFull(placed[hovered].step.value, waterfall.unit) }]}
            />
          </div>
        )}
      </div>
      <ChartNote note={waterfall.note} />
    </>
  );
}
