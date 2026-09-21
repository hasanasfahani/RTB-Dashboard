import { useState } from 'react';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { GeoData } from '../../types.ts';
import { chart, tokens } from '../../design/tokens.ts';
import { formatValue, formatValueFull } from '../../design/format.ts';
import { ChartFrame, ChartNote, TooltipShell } from './common.tsx';
import { useFilters } from '../../state/FiltersContext.tsx';

/**
 * Hand-rolled (PRD §4). Variant: `iraqBranches`.
 *
 * A proportional-symbol map: one circle per branch, area scaled to value. The outline
 * below is a deliberately coarse schematic of Iraq's border, inlined because PRD §4
 * forbids fetching anything — no tile server, no GeoJSON file, no CDN. It is there to
 * make the branch positions legible, not to be cartographically accurate.
 *
 * Phase 6 wires a click here to the branch filter (PRD §12), which is why the circles
 * already carry `onSelect`.
 */
export function GeoMap({ data, height, compact = false }: ChartProps) {
  const geo = data.shape === 'geoPoints' ? (data as GeoData) : undefined;
  const resolved = resolveHeight({ height, compact });
  const [hovered, setHovered] = useState<string | undefined>(undefined);
  /*
   * Clicking a branch sets the branch filter (PRD §12). The filter is read from context
   * rather than threaded through `ChartProps`: only this one component needs it, and
   * adding a prop to the A6-frozen contract for a single chart would be the wrong trade.
   * Outside a provider the context is a working no-op, so the gallery still renders.
   */
  const { filters, setBranch } = useFilters();

  if (!geo || geo.points.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Branch map">{null}</ChartFrame>;
  }

  const max = Math.max(...geo.points.map((point) => point.value)) || 1;
  const hoveredPoint = geo.points.find((point) => point.id === hovered);

  // Project lon/lat into the viewBox. Equirectangular is fine at this scale.
  const project = (lon: number, lat: number): [number, number] => [
    ((lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * 100,
    ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * 100,
  ];

  const outline = IRAQ_OUTLINE.map(([lon, lat]) => project(lon, lat).join(',')).join(' ');

  return (
    <>
      <div className="relative" style={{ height: resolved }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Branch network map of Iraq"
        >
          <polygon points={outline} fill={tokens.color.canvas} stroke={chart.grid} strokeWidth={0.4} />
          {geo.points.map((point) => {
            const [cx, cy] = project(point.lon, point.lat);
            // Area, not radius, is proportional to value — otherwise big branches read
            // as far bigger than they are.
            const radius = 1.2 + Math.sqrt(point.value / max) * (compact ? 4 : 6);
            const isHovered = hovered === point.id;
            const isSelected = filters.branch === point.id;
            return (
              <circle
                key={point.id}
                cx={cx}
                cy={cy}
                r={radius}
                fill={isSelected ? tokens.color.navy : tokens.color.cyan}
                fillOpacity={isHovered || isSelected ? 0.95 : 0.6}
                stroke={tokens.color.navy}
                strokeWidth={isHovered || isSelected ? 0.9 : 0.4}
                className="cursor-pointer"
                role="button"
                aria-label={`Filter to ${point.label}`}
                onMouseEnter={() => setHovered(point.id)}
                onMouseLeave={() => setHovered(undefined)}
                // Clicking the selected branch again clears the filter.
                onClick={() => setBranch(isSelected ? 'all' : point.id)}
              />
            );
          })}
          {/*
            * Only the largest branches are labelled. Six of the eleven sit in a tight
            * northern cluster (Duhok, Mosul, Erbil x2, Kirkuk, Sulaymaniyah) and
            * labelling all of them produced overlapping text. The rest are named on
            * hover, which every chart has anyway (PRD §8).
            */}
          {!compact &&
            geo.points
              .filter((point) => point.value >= max * LABEL_THRESHOLD || point.id === hovered)
              .map((point) => {
                const [cx, cy] = project(point.lon, point.lat);
                const radius = 1.2 + Math.sqrt(point.value / max) * 6;
                return (
                  <text
                    key={`${point.id}-label`}
                    x={cx}
                    y={cy - radius - 1.2}
                    textAnchor="middle"
                    fontSize={2.6}
                    fontWeight={point.id === hovered ? 700 : 400}
                    fill={tokens.color.ink}
                  >
                    {point.label}
                  </text>
                );
              })}
        </svg>

        {/*
          * The tooltip is placed from the **hovered point**, not pinned to the top.
          *
          * Fixed at top-centre it landed directly on Mosul and Erbil — the northern branches
          * sit in exactly that part of the frame, so hovering one hid it behind its own
          * readout. It now flips below a point in the upper half and sits above one in the
          * lower half, and its horizontal position is clamped so a branch near either edge
          * cannot push it out of the card.
          */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2"
            style={(() => {
              const [x, y] = project(hoveredPoint.lon, hoveredPoint.lat);
              const clampedX = Math.min(85, Math.max(15, x));
              return y < 45
                ? { insetInlineStart: `${clampedX}%`, top: `${Math.min(88, y + 7)}%` }
                : { insetInlineStart: `${clampedX}%`, bottom: `${Math.min(88, 100 - y + 7)}%` };
            })()}
          >
            <TooltipShell
              title={hoveredPoint.label}
              rows={[{ label: 'Value', value: formatValueFull(hoveredPoint.value, geo.unit) }]}
            />
          </div>
        )}
      </div>
      {!compact && (
        <p className="mt-1 text-micro text-muted">
          {geo.points.length} branches · largest {formatValue(max, geo.unit, { compact: true })} ·
          click a branch to filter
        </p>
      )}
      <ChartNote note={geo.note} />
    </>
  );
}

/** Label a branch only if it holds at least this share of the largest one's value. */
const LABEL_THRESHOLD = 0.62;

const BOUNDS = { west: 38.5, east: 48.9, south: 28.8, north: 37.6 } as const;

/**
 * A coarse Iraq border, clockwise from the north-west. Roughly 30 points — enough to be
 * recognisable at 240px, small enough to inline. Not a survey boundary.
 */
const IRAQ_OUTLINE: readonly (readonly [number, number])[] = [
  [42.4, 37.1], [42.8, 37.3], [43.5, 37.25], [44.2, 37.3], [44.8, 37.15], [45.1, 36.5],
  [45.4, 36.0], [46.1, 35.8], [45.5, 35.1], [46.1, 34.8], [45.4, 33.9], [46.1, 33.3],
  [47.4, 33.1], [47.7, 32.4], [47.9, 31.8], [47.7, 30.9], [48.0, 30.5], [48.6, 30.1],
  [48.0, 30.0], [47.4, 30.1], [46.5, 29.1], [44.7, 29.2], [42.8, 30.5], [41.3, 31.2],
  [40.4, 31.9], [39.2, 32.2], [38.8, 33.4], [40.7, 34.4], [41.2, 35.2], [41.4, 36.1],
  [41.8, 36.6],
];
