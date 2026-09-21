import { useState } from 'react';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { BreakdownData } from '../../types.ts';
import { seriesColor } from '../../design/tokens.ts';
import { formatPercent, formatValue, formatValueFull } from '../../design/format.ts';
import { ChartFrame, ChartNote, TooltipShell } from './common.tsx';

interface Tile {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Hand-rolled (PRD §4). Variant: `plain`.
 *
 * Squarified layout — tiles are kept as close to square as possible, because long thin
 * slivers are hard to compare by area, which is the only thing a treemap encodes.
 */
export function Treemap({ data, height, compact = false }: ChartProps) {
  const breakdown = data.shape === 'breakdown' ? (data as BreakdownData) : undefined;
  const resolved = resolveHeight({ height, compact });
  const [hovered, setHovered] = useState<string | undefined>(undefined);

  if (!breakdown || breakdown.slices.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Treemap">{null}</ChartFrame>;
  }

  const total = breakdown.slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const tiles = squarify(
    breakdown.slices.map((slice) => ({ key: slice.key, label: slice.label, value: slice.value })),
    100,
    100,
  );
  const hoveredTile = tiles.find((tile) => tile.key === hovered);

  return (
    <>
      <div className="relative" style={{ height: resolved }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Treemap">
          {tiles.map((tile, index) => (
            <rect
              key={tile.key}
              x={tile.x}
              y={tile.y}
              width={Math.max(0, tile.w - 0.4)}
              height={Math.max(0, tile.h - 0.4)}
              fill={seriesColor(index)}
              opacity={hovered === undefined || hovered === tile.key ? 1 : 0.6}
              onMouseEnter={() => setHovered(tile.key)}
              onMouseLeave={() => setHovered(undefined)}
            />
          ))}
        </svg>
        {/* Labels are HTML, not SVG text: a non-uniform viewBox would distort them. */}
        <div className="pointer-events-none absolute inset-0">
          {tiles.map((tile) => {
            // Only label a tile big enough to hold the text without clipping.
            if (tile.w < 16 || tile.h < 12) return null;
            return (
              <div
                key={tile.key}
                className="absolute overflow-hidden p-1 leading-tight text-surface"
                style={{
                  left: `${tile.x}%`,
                  top: `${tile.y}%`,
                  width: `${tile.w}%`,
                  height: `${tile.h}%`,
                }}
              >
                <span className="block truncate text-micro font-bold">{tile.label}</span>
                {!compact && tile.h > 18 && (
                  <span className="block truncate text-micro opacity-80">
                    {formatValue(tile.value, breakdown.unit, { compact: true })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {hoveredTile && (
          <div className="pointer-events-none absolute start-1/2 top-1 z-10 -translate-x-1/2">
            <TooltipShell
              title={hoveredTile.label}
              rows={[
                { label: 'Value', value: formatValueFull(hoveredTile.value, breakdown.unit) },
                { label: 'Share', value: formatPercent((hoveredTile.value / total) * 100) },
              ]}
            />
          </div>
        )}
      </div>
      <ChartNote note={breakdown.note} />
    </>
  );
}

interface Item {
  readonly key: string;
  readonly label: string;
  readonly value: number;
}

/**
 * Squarified treemap (Bruls, Huizing & van Wijk).
 *
 * Lays a run of tiles along the shorter side of the remaining rectangle, extending the
 * run while doing so improves the worst aspect ratio, then recurses on what is left.
 */
function squarify(items: readonly Item[], width: number, height: number): Tile[] {
  const positive = items.filter((item) => item.value > 0);
  if (positive.length === 0) return [];

  const total = positive.reduce((sum, item) => sum + item.value, 0);
  const scale = (width * height) / total;
  const scaled = [...positive]
    .sort((a, b) => b.value - a.value)
    .map((item) => ({ ...item, area: item.value * scale }));

  const tiles: Tile[] = [];
  let x = 0;
  let y = 0;
  let free = { w: width, h: height };
  let row: typeof scaled = [];

  const worst = (candidate: typeof scaled, side: number): number => {
    const sum = candidate.reduce((acc, item) => acc + item.area, 0);
    if (sum === 0) return Infinity;
    const max = Math.max(...candidate.map((item) => item.area));
    const min = Math.min(...candidate.map((item) => item.area));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };

  const flushRow = (): void => {
    const sum = row.reduce((acc, item) => acc + item.area, 0);
    if (sum === 0) {
      row = [];
      return;
    }
    const horizontal = free.w >= free.h;
    const thickness = sum / (horizontal ? free.h : free.w);
    let offset = 0;

    for (const item of row) {
      const length = item.area / thickness;
      tiles.push(
        horizontal
          ? { key: item.key, label: item.label, value: item.value, x, y: y + offset, w: thickness, h: length }
          : { key: item.key, label: item.label, value: item.value, x: x + offset, y, w: length, h: thickness },
      );
      offset += length;
    }

    if (horizontal) {
      x += thickness;
      free = { w: free.w - thickness, h: free.h };
    } else {
      y += thickness;
      free = { w: free.w, h: free.h - thickness };
    }
    row = [];
  };

  for (const item of scaled) {
    const side = Math.min(free.w, free.h);
    if (row.length === 0 || worst([...row, item], side) <= worst(row, side)) {
      row.push(item);
    } else {
      flushRow();
      row.push(item);
    }
  }
  flushRow();

  return tiles;
}
