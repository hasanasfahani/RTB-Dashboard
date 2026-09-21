import type { ChartProps } from './contract.ts';
import type { TableData } from '../../types.ts';
import { formatValue } from '../../design/format.ts';
import { ChartFrame, ChartNote } from './common.tsx';

/**
 * Variant: `exception`.
 *
 * An exception report, so the flagged rows are the content — they are marked with a
 * left rule and a status word rather than a full red row, because colouring an entire
 * row red overstates a limit breach that the Status column already states.
 */
export function DataTable({ data, height, compact = false }: ChartProps) {
  const table = data.shape === 'tableRows' ? (data as TableData) : undefined;

  if (!table || table.rows.length === 0 || table.columns.length === 0) {
    return <ChartFrame height={height ?? (compact ? 160 : 240)} isEmpty label="Data table">{null}</ChartFrame>;
  }

  const flagged = new Set(table.flagged ?? []);
  const rows = compact ? table.rows.slice(0, 5) : table.rows;

  return (
    <>
      <div className="overflow-x-auto" style={{ maxHeight: height ?? (compact ? 160 : 260) }}>
        <table className="w-full border-collapse text-body">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-line">
              {table.columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  /*
                   * Header in **ink**, not muted.
                   *
                   * It was lighter than the cells beneath it, which inverts the hierarchy —
                   * rtb.iq's own fee tables do the opposite, setting headers darker and
                   * heavier than the values and carrying the whole structure on weight
                   * rather than on a filled header band. `px-3` because the columns had
                   * vertical padding only and were touching each other.
                   */
                  className={`px-3 py-2 text-label text-ink first:ps-0 last:pe-0 ${
                    column.align === 'end' ? 'text-end' : 'text-start'
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const key = String(row.key ?? index);
              const isFlagged = flagged.has(key);
              return (
                <tr
                  key={key}
                  className={`border-b border-line last:border-0 ${
                    isFlagged ? 'border-s-2 border-s-negative bg-canvas' : ''
                  }`}
                >
                  {table.columns.map((column) => {
                    const value = row[column.key];
                    const rendered =
                      typeof value === 'number' && column.unit
                        ? formatValue(value, column.unit, { compact: true })
                        : String(value ?? '');
                    return (
                      <td
                        key={column.key}
                        className={`px-3 py-2 first:ps-0 last:pe-0 ${
                          column.align === 'end' ? 'text-end tabular-nums' : 'text-start'
                        } ${
                          column.key === 'status' && isFlagged ? 'font-bold text-negative' : 'text-ink'
                        }`}
                      >
                        {rendered}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {flagged.size > 0 && (
        <p className="mt-2 text-micro text-muted">
          {flagged.size} of {table.rows.length} rows outside limit
        </p>
      )}
      <ChartNote note={table.note} />
    </>
  );
}
