import { useEffect, useRef, useState } from 'react';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { MatrixData, RagStatus } from '../../types.ts';
import { chart, tokens } from '../../design/tokens.ts';
import { formatMonthTick, formatValue, formatValueFull } from '../../design/format.ts';
import { ChartFrame, ChartNote, TooltipShell } from './common.tsx';

/**
 * Hand-rolled (PRD §4). Variants: `intensity`, `rag`, `cohort`.
 *
 * `rag` is the traffic-light panel — D2 dropped `TrafficLightPanel` and these four
 * insights are what it would have rendered. `cohort` is triangular: later cohorts have
 * had fewer months to age, so the missing cells are the truth, not a gap.
 */
export function Heatmap({ data, variant, height, compact = false }: ChartProps) {
  const matrix = data.shape === 'matrix' ? (data as MatrixData) : undefined;
  const resolved = resolveHeight({ height, compact });
  const [hovered, setHovered] = useState<string | undefined>(undefined);

  /*
   * How many column labels there is room for, measured rather than guessed.
   *
   * Twelve months is comfortable across a full-width card and impossible in the half a
   * co-equal two-panel card gives it — G-28 had about eight pixels a column, so `Oct`, `Nov`
   * and `Dec` ran into one another. Column count cannot tell the two apart; only width can.
   * Labels are thinned the way a time axis thins its ticks, and the ones kept are anchored to
   * the **last** column so the most recent period is always labelled.
   */
  const tableRef = useRef<HTMLTableElement>(null);
  const [labelEvery, setLabelEvery] = useState(1);

  if (!matrix || matrix.cells.length === 0 || matrix.rows.length === 0 || matrix.cols.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Heatmap">{null}</ChartFrame>;
  }

  const byCell = new Map(matrix.cells.map((cell) => [`${cell.row}|${cell.col}`, cell]));
  const values = matrix.cells.map((cell) => cell.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const hoveredCell = hovered ? byCell.get(hovered) : undefined;

  return (
    <>
      <div className="relative" style={{ minHeight: resolved }}>
        <ColumnFit tableRef={tableRef} cols={matrix.cols} onFit={setLabelEvery} />
        <table ref={tableRef} className="w-full table-fixed border-separate border-spacing-[2px]">
          {!compact && (
            <thead>
              <tr>
                <th className="w-[84px] text-start text-micro font-normal text-muted">
                  {matrix.rowLabel ?? ''}
                </th>
                {matrix.cols.map((col, index) => {
                  // Anchored to the last column, so the latest period always carries a label.
                  const shown = (matrix.cols.length - 1 - index) % labelEvery === 0;
                  const label = shown
                    ? columnLabel(col, index, matrix.cols)
                    : { head: '', sub: undefined };
                  return (
                    <th
                      key={col}
                      className="whitespace-nowrap text-micro font-normal leading-tight text-muted"
                      scope="col"
                      title={col}
                    >
                      <span className="block">{label.head}</span>
                      {label.sub !== undefined && (
                        <span className="block opacity-70">{label.sub}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
          )}
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row}>
                {!compact && (
                  <th
                    scope="row"
                    className="truncate pe-1 text-start text-micro font-normal text-muted"
                    title={row}
                  >
                    {row}
                  </th>
                )}
                {matrix.cols.map((col) => {
                  const key = `${row}|${col}`;
                  const cell = byCell.get(key);
                  return (
                    <td
                      key={col}
                      className="h-5 rounded-chip"
                      style={{
                        backgroundColor: cell
                          ? cellColour(cell.status, (cell.value - min) / span, variant)
                          : 'transparent',
                        // A cohort's missing cells are outlined, so the triangle reads
                        // as "not yet observed" rather than "zero".
                        border: cell ? 'none' : `1px dashed ${chart.grid}`,
                      }}
                      onMouseEnter={() => setHovered(key)}
                      onMouseLeave={() => setHovered(undefined)}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {hoveredCell && (
          <div className="pointer-events-none absolute start-1/2 top-0 z-10 -translate-x-1/2">
            <TooltipShell
              title={`${hoveredCell.row} · ${hoveredCell.col}`}
              rows={[
                { label: matrix.colLabel ?? 'Value', value: formatValueFull(hoveredCell.value, matrix.unit) },
                ...(hoveredCell.status
                  ? [{ label: 'Status', value: hoveredCell.status.toUpperCase() }]
                  : []),
              ]}
            />
          </div>
        )}
      </div>
      {!compact && <Scale variant={variant} min={min} max={max} unit={matrix.unit} />}
      <ChartNote note={matrix.note} />
    </>
  );
}

const RAG_COLOUR: Record<RagStatus, string> = {
  green: tokens.color.positive,
  amber: tokens.color.warning,
  red: tokens.color.negative,
};

/**
 * Intensity uses the navy→cyan ramp rather than a red/green one: PRD §8 allows
 * good/bad colour only where there is a real threshold, and a magnitude is not one.
 * RAG cells carry an explicit status, which is a threshold.
 */
function cellColour(status: RagStatus | undefined, intensity: number, variant: string): string {
  if (status) return RAG_COLOUR[status];
  const clamped = Math.min(1, Math.max(0, intensity));
  if (variant === 'cohort') {
    // Retention: full navy is a strong cohort, fading out as it decays.
    return mix(tokens.color.line, tokens.color.navy, clamped);
  }
  return mix(tokens.color.line, tokens.color.cyan, clamped);
}

function mix(from: string, to: string, amount: number): string {
  const parse = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const channel = (a: number, b: number): number => Math.round(a + (b - a) * amount);
  return `rgb(${channel(r1, r2)}, ${channel(g1, g2)}, ${channel(b1, b2)})`;
}

/**
 * The scale carries its own range.
 *
 * Cell colour is normalised to the matrix's own min and max, so when a filter scales
 * every cell by the same factor the colours come out identical and the chart appears
 * not to respond — exactly what PRD §12 warns about. Printing the range makes the
 * change visible without distorting the encoding.
 */
function Scale({
  variant,
  min,
  max,
  unit,
}: {
  variant: string;
  min: number;
  max: number;
  unit: MatrixData['unit'];
}) {
  if (variant === 'rag') {
    return (
      <ul className="mt-2 flex items-center gap-3">
        {(['green', 'amber', 'red'] as const).map((status) => (
          <li key={status} className="flex items-center gap-1.5 text-micro text-muted">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: RAG_COLOUR[status] }} />
            {status === 'green' ? 'Within limit' : status === 'amber' ? 'Watch' : 'Breach'}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2 text-micro text-muted">
      <span className="tabular-nums">{formatValue(min, unit, { compact: true })}</span>
      <span
        className="h-1.5 flex-1 rounded-chip"
        style={{
          backgroundImage: `linear-gradient(to right, ${tokens.color.line}, ${
            variant === 'cohort' ? tokens.color.navy : tokens.color.cyan
          })`,
        }}
      />
      <span className="tabular-nums">{formatValue(max, unit, { compact: true })}</span>
    </div>
  );
}

/**
 * A column header that fits the column.
 *
 * Twelve months across a half-width card leaves each column about twenty pixels, and the raw
 * key — `2025-09` — wrapped onto three lines and shouldered the grid out of shape on C-37 and
 * G-28. The key has to stay as it is, because it is what the cells are looked up by, so only
 * the rendering changes.
 *
 * The year is carried on a second line and **only where it changes**, which is the first
 * column and each January: repeating `25` twelve times spends the same space to say nothing.
 * Daily columns get the day, with the month appearing the same way. Anything that is not a
 * date — `00–04` on R-35's hour bands — is left exactly as it is.
 */
function columnLabel(
  col: string,
  index: number,
  cols: readonly string[],
): { head: string; sub?: string } {
  const monthly = /^(\d{4})-(\d{2})$/.exec(col);
  if (monthly) {
    const [, year, month] = monthly;
    const head = formatMonthTick(`${year}-${month}-01`).split(' ')[0] ?? col;
    const previous = cols[index - 1];
    const changed = index === 0 || previous?.slice(0, 4) !== year;
    return changed ? { head, sub: `'${year?.slice(2) ?? ''}` } : { head };
  }

  const daily = /^(\d{4})-(\d{2})-(\d{2})$/.exec(col);
  if (daily) {
    const [, , month, day] = daily;
    const head = String(Number(day));
    const previous = cols[index - 1];
    const changed = index === 0 || previous?.slice(5, 7) !== month;
    return changed
      ? { head, sub: formatMonthTick(`${daily[1]}-${month}-01`).split(' ')[0] ?? '' }
      : { head };
  }

  return { head: col };
}

/**
 * Watches the table and reports how often a column can afford a label.
 *
 * A component rather than an effect inside `Heatmap` only because the early `isEmpty` return
 * sits above it, and a hook cannot live below a conditional return.
 */
function ColumnFit({
  tableRef,
  cols,
  onFit,
}: {
  tableRef: React.RefObject<HTMLTableElement>;
  cols: readonly string[];
  onFit: (every: number) => void;
}) {
  /*
   * Only a **date** axis is thinned.
   *
   * `rag` heatmaps label their columns `Limit`, `Actual`, `Headroom` — every one of which has
   * to be read, and none of which can be inferred from its neighbours the way a month can.
   * Thinning those hid two of three. A month is skippable because the sequence is known; a
   * category is not.
   */
  const datesOnly = cols.every((col) => /^\d{4}-\d{2}(-\d{2})?$/.test(col));

  useEffect(() => {
    const table = tableRef.current;
    if (!table || !datesOnly) {
      onFit(1);
      return;
    }
    const measure = (): void => {
      // The row-label column is measured, not assumed — variants size it differently.
      const rowLabelWidth = table.querySelector('thead th')?.getBoundingClientRect().width ?? 0;
      const usable = table.getBoundingClientRect().width - rowLabelWidth;
      const perColumn = usable / Math.max(1, cols.length);
      // A month abbreviation needs roughly 26px at 9px type, plus the 2px cell spacing.
      const every = perColumn >= 26 ? 1 : perColumn >= 13 ? 2 : perColumn >= 9 ? 3 : 4;
      onFit(Math.max(1, every));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    return () => observer.disconnect();
  }, [tableRef, cols.length, datesOnly, onFit]);
  return null;
}
