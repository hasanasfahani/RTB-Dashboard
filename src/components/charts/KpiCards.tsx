import type { ChartProps } from './contract.ts';
import type { KpiCard, KpiData } from '../../types.ts';
import { seriesColor, tokens } from '../../design/tokens.ts';
import { formatValue } from '../../design/format.ts';
import { Delta } from '../ui/Delta.tsx';
import { ChartFrame, ChartNote } from './common.tsx';

/**
 * Variants: `sparkline`, `plain`.
 *
 * The most common second panel in the catalogue — 23 of the 73 two-panel insights
 * (plan §2.7), which is why the insight card gives it a narrow sidecar rather than
 * half the width.
 */
export function KpiCards({ data, compact = false }: ChartProps) {
  const kpis = data.shape === 'kpiSet' ? (data as KpiData) : undefined;

  if (!kpis || kpis.cards.length === 0) {
    return <ChartFrame height={compact ? 80 : 120} isEmpty label="KPI cards">{null}</ChartFrame>;
  }

  /*
   * Columns come from the **width available**, not from the number of cards.
   *
   * Counting cards was wrong in the one place these appear most: as the sidecar of a
   * two-panel card, which is a ~250px column. Three cards asked for three columns there, so
   * each 28px figure had about 75px to sit in and they ran into one another — G-13 read
   * `829.5B363.7B634.6B`, and the sparklines landed on top of the numbers.
   *
   * `auto-fit` with a floor wide enough for a formatted figure means a sidecar stacks, a
   * half-card pairs and a full-width card spreads, without any of them being told which
   * they are.
   */
  return (
    <>
      {/* Capped: stretched across a full-width card the tiles drift apart and the
          sparkline floats away from the number it belongs to. */}
      <div
        className={`grid max-w-3xl gap-x-5 gap-y-4 ${
          compact ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]'
        }`}
      >
        {kpis.cards.map((card) => (
          <Tile key={card.key} card={card} compact={compact} />
        ))}
      </div>
      <ChartNote note={kpis.note} />
    </>
  );
}

function Tile({ card, compact }: { card: KpiCard; compact: boolean }) {
  return (
    // No border: these sit inside a card already, and a box inside a box is the visual
    // language of a form. A hairline on the leading edge is enough separation.
    // `min-w-0`: without it a grid item refuses to shrink below its content, so a long
    // figure widens its own column and pushes the next one off the card.
    <div className="min-w-0 border-s-2 border-line ps-3">
      <p className="truncate text-label text-muted" title={card.label}>
        {card.label}
      </p>
      <p className={`truncate ${compact ? 'text-h1' : 'text-kpi'} text-navy`}>
        {formatValue(card.value, card.unit, { compact: true })}
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        {card.deltaPct !== undefined ? (
          <Delta value={card.deltaPct} downIsGood={card.downIsGood ?? false} />
        ) : (
          <span />
        )}
        {/* Allowed to shrink, so it never pushes the delta out of its own tile. */}
        {card.spark && card.spark.length > 1 && (
          <span className="min-w-0 flex-1 overflow-hidden text-end">
            <Sparkline values={card.spark} />
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Hand-rolled, not Recharts: a 12-point sparkline in a KPI tile does not need an axis
 * system, and 27 of these on one screen would be a bundle-size problem (PRD §13).
 */
export function Sparkline({
  values,
  width = 64,
  height = 18,
  colour = tokens.color.cyan,
}: {
  values: readonly number[];
  width?: number;
  height?: number;
  colour?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);

  const points = values
    .map((value, index) => `${index * step},${height - ((value - min) / span) * height}`)
    .join(' ');

  return (
    <svg width={width} height={height} aria-hidden="true" className="shrink-0 overflow-visible">
      <polyline points={points} fill="none" stroke={colour} strokeWidth={1.5} strokeLinejoin="round" />
      <circle
        cx={(values.length - 1) * step}
        cy={height - (((values.at(-1) ?? min) - min) / span) * height}
        r={1.8}
        fill={colour}
      />
    </svg>
  );
}

/** Series colour helper used by the headline band's inverted tiles. */
export const SPARK_ON_NAVY = seriesColor(3);
