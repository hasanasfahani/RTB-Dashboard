/**
 * Shared chart plumbing — the conventions in PRD §8 live here, so no chart restates
 * them and none can drift.
 *
 *   - navy primary, cyan secondary, then the extended ramp
 *   - targets and appetite bands dashed, never solid
 *   - regulatory floors red, dashed, always labelled
 *   - a tooltip on every chart, showing the formatted value and the dimension label
 *   - empty and single-point data render without throwing
 */

import type { ReactNode } from 'react';
import { CartesianGrid, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts';
import type { Reference, Unit } from '../../types.ts';
import { chart, tokens } from '../../design/tokens.ts';
import { formatAxisTick, formatValueFull } from '../../design/format.ts';

export const DASH_TARGET = '4 3';
export const DASH_FLOOR = '5 3';

/**
 * Charts do not animate. Not on mount, and not on a data change.
 *
 * Mount animation was never viable: Retail mounts around 78 panels at once and Recharts
 * animates 1500ms per chart, which would turn the 20ms section-tab switch into a
 * stutter (plan §2.14). A transition on *change* was built and reviewed in Phase 9 and
 * rejected — a filter change already blocks the main thread for ~450ms re-rendering 78
 * panels, and only 13 of the 23 components can transition at all, so a filter change
 * had some charts gliding while gauges, treemaps and Sankeys snapped (plan §2.18).
 *
 * The one piece of motion that survived is the Executive arrival, in `design/motion.ts`.
 */
export const CHART_ANIMATION = false;

/** Wraps a chart, and short-circuits the empty case so no chart has to (PRD §8). */
export function ChartFrame({
  height,
  isEmpty,
  children,
  label,
}: {
  height: number;
  isEmpty: boolean;
  children: ReactNode;
  label?: string | undefined;
}) {
  if (isEmpty) {
    return (
      <div
        className="flex items-center justify-center rounded-card border border-dashed border-line"
        style={{ height }}
        role="img"
        aria-label={label ? `${label} — no data` : 'No data'}
      >
        <span className="text-micro text-muted">No data for this selection</span>
      </div>
    );
  }
  return (
    <div style={{ height }} aria-label={label}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Axes
// ---------------------------------------------------------------------------

const AXIS_TICK = { fill: tokens.color.muted, fontSize: 10 };

export function categoryAxis({
  compact,
  formatter,
  interval,
  angled = false,
}: {
  compact: boolean;
  formatter: (value: string) => string;
  interval?: number;
  angled?: boolean;
}) {
  return (
    <XAxis
      dataKey="t"
      tick={compact ? false : AXIS_TICK}
      tickLine={false}
      axisLine={{ stroke: chart.grid }}
      tickFormatter={formatter}
      {...(interval !== undefined ? { interval } : { interval: 'preserveStartEnd' as const })}
      {...(angled && !compact ? { angle: -35, textAnchor: 'end' as const, height: 52 } : {})}
      minTickGap={compact ? 24 : 8}
    />
  );
}

export function valueAxis({
  compact,
  unit,
  orientation = 'left',
  domain,
  width,
}: {
  compact: boolean;
  unit: Unit;
  orientation?: 'left' | 'right';
  domain?: [number | string, number | string];
  width?: number;
}) {
  return (
    <YAxis
      orientation={orientation}
      {...(orientation === 'right' ? { yAxisId: 'right' } : {})}
      tick={compact ? false : AXIS_TICK}
      tickLine={false}
      axisLine={false}
      width={compact ? 4 : (width ?? 52)}
      tickFormatter={(value: number) => formatAxisTick(value, unit)}
      {...(domain ? { domain } : {})}
    />
  );
}

export function grid() {
  return <CartesianGrid stroke={chart.grid} strokeDasharray="0" vertical={false} />;
}

// ---------------------------------------------------------------------------
// References — PRD §8
// ---------------------------------------------------------------------------

/**
 * Renders targets, floors and appetite bands.
 *
 * A floor is red, dashed and always labelled; a target is dashed and muted; a band is
 * a shaded area. Returns an array so a chart can spread it among Recharts children.
 */
export function referenceMarks(
  references: readonly Reference[] | undefined,
  options: { compact: boolean; axisId?: string } = { compact: false },
): ReactNode[] {
  if (!references || references.length === 0) return [];
  const marks: ReactNode[] = [];

  references.forEach((reference, index) => {
    const key = `${reference.kind}-${index}`;
    if (reference.kind === 'band' && reference.upper !== undefined) {
      marks.push(
        <ReferenceArea
          key={key}
          y1={reference.value}
          y2={reference.upper}
          fill={chart.band}
          fillOpacity={0.7}
          stroke="none"
          {...(options.axisId ? { yAxisId: options.axisId } : {})}
        />,
      );
      return;
    }

    const isFloor = reference.kind === 'floor';
    marks.push(
      <ReferenceLine
        key={key}
        y={reference.value}
        stroke={isFloor ? chart.floor : chart.target}
        strokeDasharray={isFloor ? DASH_FLOOR : DASH_TARGET}
        strokeWidth={1}
        {...(options.axisId ? { yAxisId: options.axisId } : {})}
        // A floor must always be labelled, even compact.
        {...(isFloor || !options.compact
          ? {
              label: {
                value: reference.label,
                position: 'insideTopLeft' as const,
                fill: isFloor ? chart.floor : tokens.color.muted,
                fontSize: 9,
              },
            }
          : {})}
      />,
    );
  });

  return marks;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

export interface TooltipRow {
  readonly label: string;
  readonly value: string;
  readonly colour?: string;
}

/** One tooltip shell, so every chart's hover looks the same (PRD §8). */
export function TooltipShell({ title, rows }: { title?: string; rows: readonly TooltipRow[] }) {
  return (
    <div className="rounded-card border border-line bg-surface px-3 py-2 shadow-sm">
      {title && <p className="mb-1 text-micro font-bold text-muted">{title}</p>}
      <ul className="space-y-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-baseline gap-2 text-micro">
            {row.colour && (
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: row.colour }}
              />
            )}
            <span className="text-muted">{row.label}</span>
            <span className="ms-auto font-bold text-ink">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Recharts passes an untyped payload; narrow it here rather than in every chart. */
export interface RechartsPayloadEntry {
  readonly name?: string | number;
  readonly value?: number | string;
  readonly color?: string;
  readonly dataKey?: string | number;
  readonly payload?: Record<string, unknown>;
}

export function payloadRows(
  payload: readonly RechartsPayloadEntry[] | undefined,
  unit: Unit,
): TooltipRow[] {
  if (!payload) return [];
  return payload
    .filter((entry) => typeof entry.value === 'number')
    .map((entry) => ({
      label: String(entry.name ?? entry.dataKey ?? ''),
      value: formatValueFull(entry.value as number, unit),
      ...(entry.color ? { colour: entry.color } : {}),
    }));
}

/** A direct label on the plot, used instead of a legend where two series fit (PRD §8). */
export function SeriesLabel({ label, colour }: { label: string; colour: string }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5 text-micro">
      <span className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: colour }} />
      {/* Truncates rather than widening its row — a long series name must not be able
          to push a chart past the edge of the page. */}
      <span className="truncate text-muted" title={label}>
        {label}
      </span>
    </span>
  );
}

/** Legend row for stacked charts, where direct labelling is not possible. */
export function SeriesLegend({
  entries,
  className = '',
}: {
  entries: readonly { key: string; label: string; colour: string }[];
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      {entries.map((entry) => (
        <li key={entry.key}>
          <SeriesLabel label={entry.label} colour={entry.colour} />
        </li>
      ))}
    </ul>
  );
}

/** Caveat text, e.g. where PRD Appendix A note 5 applies. */
export function ChartNote({ note }: { note: string | undefined }) {
  if (!note) return null;
  return <p className="mt-2 text-micro italic text-muted">{note}</p>;
}
