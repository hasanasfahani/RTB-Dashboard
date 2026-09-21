import { useState } from 'react';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { FunnelData } from '../../types.ts';
import { readableOn, seriesColor } from '../../design/tokens.ts';
import { formatPercent, formatValue, formatValueFull } from '../../design/format.ts';
import { ChartFrame, ChartNote, TooltipShell } from './common.tsx';

/**
 * Hand-rolled (PRD §4). Variant: `plain`.
 *
 * Centred trapezoids, one per step. The drop between steps is the finding, so the
 * step-to-step conversion is labelled on the plot rather than left to a tooltip.
 */
export function FunnelChart({ data, height, compact = false }: ChartProps) {
  const funnel = data.shape === 'funnelSteps' ? (data as FunnelData) : undefined;
  const resolved = resolveHeight({ height, compact });
  const [hovered, setHovered] = useState<number | undefined>(undefined);

  if (!funnel || funnel.steps.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Funnel">{null}</ChartFrame>;
  }

  const steps = funnel.steps;
  const widest = Math.max(...steps.map((step) => step.value)) || 1;
  const bandHeight = 100 / steps.length;
  const hoveredStep = hovered !== undefined ? steps[hovered] : undefined;

  const widthAt = (index: number): number => {
    const step = steps[index];
    return step ? Math.max(4, (step.value / widest) * 100) : 4;
  };

  return (
    <>
      <div className="relative" style={{ height: resolved }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Funnel">
          {steps.map((step, index) => {
            const top = index * bandHeight;
            const bottom = top + bandHeight - 0.8;
            const upper = widthAt(index);
            // The last band keeps its width so the funnel ends flat, not at a point.
            const lower = index === steps.length - 1 ? upper : widthAt(index + 1);
            const points = [
              `${(100 - upper) / 2},${top}`,
              `${(100 + upper) / 2},${top}`,
              `${(100 + lower) / 2},${bottom}`,
              `${(100 - lower) / 2},${bottom}`,
            ].join(' ');
            return (
              <polygon
                key={step.key}
                points={points}
                fill={seriesColor(index)}
                opacity={hovered === undefined || hovered === index ? 1 : 0.6}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(undefined)}
              />
            );
          })}
        </svg>

        {/*
          * Labels sit **inside the band**, centred.
          *
          * They used to span the full width with the name hard left and the value hard right
          * — which is off the polygon entirely once the funnel narrows, so on R-23 the lower
          * steps had their text on the white background beside the shape rather than on it.
          * The row is now as wide as the *narrowest* edge of its own band, so it cannot
          * overhang however steeply the funnel closes.
          */}
        <div className="pointer-events-none absolute inset-0">
          {steps.map((step, index) => {
            const upper = widthAt(index);
            const lower = index === steps.length - 1 ? upper : widthAt(index + 1);
            const inner = Math.min(upper, lower);
            return (
              <div
                key={step.key}
                className="absolute flex items-center justify-center gap-2 px-2"
                style={{
                  top: `${index * bandHeight}%`,
                  height: `${bandHeight}%`,
                  width: `${inner}%`,
                  insetInlineStart: `${(100 - inner) / 2}%`,
                  // Ink on the pale end of the ramp, white on the dark end.
                  color: readableOn(seriesColor(index)),
                }}
              >
                <span className="truncate text-micro font-bold">{step.label}</span>
                <span className="flex items-baseline gap-2 text-micro">
                  <span className="font-bold">
                    {formatValue(step.value, funnel.unit, { compact: true })}
                  </span>
                  {!compact && index > 0 && (
                    <span className="opacity-80">{formatPercent(step.conversionPct)}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {hoveredStep && (
          <div className="pointer-events-none absolute end-2 top-1 z-10">
            <TooltipShell
              title={hoveredStep.label}
              rows={[
                { label: 'Volume', value: formatValueFull(hoveredStep.value, funnel.unit) },
                { label: 'From previous step', value: formatPercent(hoveredStep.conversionPct) },
              ]}
            />
          </div>
        )}
      </div>
      <ChartNote note={funnel.note} />
    </>
  );
}
