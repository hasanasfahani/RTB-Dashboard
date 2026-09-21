import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { Gauge, GaugeSetData } from '../../types.ts';
import { chart, tokens } from '../../design/tokens.ts';
import { formatValue } from '../../design/format.ts';
import { ChartFrame, ChartNote, DASH_FLOOR, DASH_TARGET } from './common.tsx';

/**
 * Hand-rolled SVG (PRD §4). Variants: `target`, `regulatoryFloor`.
 *
 * A panel holds several gauges: E-02 is NIM *and* CIR, E-04 is LCR, NSFR *and* LDR
 * (plan §2.8). Floors are red, dashed and always labelled; targets are dashed.
 */
export function GaugeChart({ data, height, compact = false }: ChartProps) {
  const set = data.shape === 'gaugeSet' ? (data as GaugeSetData) : undefined;
  const resolved = resolveHeight({ height, compact });

  if (!set || set.gauges.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Gauge">{null}</ChartFrame>;
  }

  return (
    <>
      <div
        className="flex h-full items-center justify-around gap-2"
        style={{ minHeight: resolved }}
      >
        {set.gauges.map((gauge) => (
          <Dial key={gauge.key} gauge={gauge} unit={set.unit} compact={compact} count={set.gauges.length} />
        ))}
      </div>
      <ChartNote note={set.note} />
    </>
  );
}

const ARC_START = 180;
const ARC_SWEEP = 180;

function polar(cx: number, cy: number, radius: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [cx + radius * Math.cos(radians), cy - radius * Math.sin(radians)];
}

function arcPath(cx: number, cy: number, radius: number, fromDeg: number, toDeg: number): string {
  const [x1, y1] = polar(cx, cy, radius, fromDeg);
  const [x2, y2] = polar(cx, cy, radius, toDeg);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  // Sweep flag 1 because the arc runs clockwise from 180° down to 0°.
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
}

function Dial({
  gauge,
  unit,
  compact,
  count,
}: {
  gauge: Gauge;
  unit: GaugeSetData['unit'];
  compact: boolean;
  count: number;
}) {
  const width = compact ? 96 : count > 2 ? 132 : 164;
  const stroke = compact ? 8 : 12;
  const cx = width / 2;
  const radius = cx - stroke / 2 - 2;
  const cy = radius + stroke / 2 + 2;
  const svgHeight = cy + (compact ? 6 : 10);

  const span = gauge.max - gauge.min || 1;
  const fraction = Math.min(1, Math.max(0, (gauge.value - gauge.min) / span));
  const valueDeg = ARC_START - fraction * ARC_SWEEP;

  const degreeFor = (value: number): number =>
    ARC_START - Math.min(1, Math.max(0, (value - gauge.min) / span)) * ARC_SWEEP;

  /*
   * Colour only where there is a real threshold (PRD §8). A gauge with neither target
   * nor floor stays navy rather than inventing a good/bad reading.
   *
   * Direction matters: "green is on plan, amber is drift" (PRD §15 beat 2). CIR above
   * its target is drift, CAR above its target is not — so the read depends on
   * `downIsGood`, not on the size of the gap.
   */
  let valueColour: string = tokens.color.navy;
  if (gauge.floor !== undefined) {
    // Red is reserved for a regulatory breach. PRD §8 ties red to floors, and using it
    // for an ordinary target miss would dilute the one signal that must not be missed.
    valueColour = gauge.value < gauge.floor ? chart.negative : chart.positive;
  } else if (gauge.target !== undefined) {
    const favourable = gauge.downIsGood ? gauge.value <= gauge.target : gauge.value >= gauge.target;
    valueColour = favourable ? chart.positive : chart.warning;
  }

  return (
    <figure className="flex flex-col items-center">
      <svg width={width} height={svgHeight} role="img" aria-label={`${gauge.label} ${formatValue(gauge.value, unit)}`}>
        {/* Track */}
        <path
          d={arcPath(cx, cy, radius, ARC_START, ARC_START - ARC_SWEEP)}
          fill="none"
          stroke={chart.grid}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Value */}
        {fraction > 0 && (
          <path
            d={arcPath(cx, cy, radius, ARC_START, valueDeg)}
            fill="none"
            stroke={valueColour}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        )}
        {/* Target — dashed, never solid */}
        {gauge.target !== undefined && (
          <path
            d={arcPath(cx, cy, radius + stroke / 2 + 3, degreeFor(gauge.target) + 0.6, degreeFor(gauge.target) - 0.6)}
            fill="none"
            stroke={chart.target}
            strokeDasharray={DASH_TARGET}
            strokeWidth={6}
          />
        )}
        {/*
          * Regulatory floor — red and dashed on the arc. The label goes in the caption
          * rather than beside the tick: at the top of a 180° arc the text ran past the
          * SVG edge and was clipped, and PRD §8 says a floor is *always* labelled.
          */}
        {gauge.floor !== undefined && (
          <line
            x1={polar(cx, cy, radius - stroke / 2 - 2, degreeFor(gauge.floor))[0]}
            y1={polar(cx, cy, radius - stroke / 2 - 2, degreeFor(gauge.floor))[1]}
            x2={polar(cx, cy, radius + stroke / 2 + 2, degreeFor(gauge.floor))[0]}
            y2={polar(cx, cy, radius + stroke / 2 + 2, degreeFor(gauge.floor))[1]}
            stroke={chart.floor}
            strokeWidth={2}
            strokeDasharray={DASH_FLOOR}
          />
        )}
        <text x={cx} y={cy - 2} textAnchor="middle" fill={tokens.color.navy} fontSize={compact ? 14 : 20} fontWeight={700}>
          {formatValue(gauge.value, unit, { compact: true })}
        </text>
      </svg>
      <figcaption className="mt-0.5 text-center">
        <span className="block text-label text-muted">{gauge.label}</span>
        {!compact && gauge.target !== undefined && (
          <span className="block text-micro text-muted">
            target {formatValue(gauge.target, unit, { compact: true })}
          </span>
        )}
        {gauge.floor !== undefined && (
          <span className="block text-micro font-bold text-negative">
            min {formatValue(gauge.floor, unit, { compact: true })}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
