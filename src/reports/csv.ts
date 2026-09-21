/**
 * CSV for any block, in fifteen cases.
 *
 * The supplied spec gives each of its registry entries an optional per-block `csv`, which
 * means writing an exporter per block and remembering to add one whenever a block is
 * added. Here `ChartData` is a discriminated union of fifteen shapes and every one of the
 * 163 blocks produces one of them, so a single writer covers all of them — and stays
 * covered when a 164th block arrives.
 *
 * **I8 comes free.** The rule is that a CSV must hold the same view the panel drew, and it
 * does by construction: the caller hands this the very `ChartData` the chart was given.
 * There is no second query to drift out of step, and no way to export a slice that was
 * never on screen.
 *
 * Nothing here touches the network or any store — a Blob and an anchor, which is a
 * download, not a fetch (PRD §4).
 */

import type { ChartData, Unit } from '../types.ts';

export interface CsvTable {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly (string | number)[])[];
}

// ---------------------------------------------------------------------------
// Serialising
// ---------------------------------------------------------------------------

/**
 * RFC 4180 quoting.
 *
 * A leading `=`, `+`, `-` or `@` is prefixed with an apostrophe. Excel reads those as the
 * start of a formula, and an insight label that begins with a minus sign would otherwise
 * open as `#NAME?` — or, in the general case, run whatever the text says. Numbers are
 * written bare, so they arrive as numbers.
 */
function cell(value: string | number): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function toCsv(table: CsvTable): string {
  const lines = [table.columns.map(cell).join(',')];
  for (const row of table.rows) lines.push(row.map(cell).join(','));
  // CRLF, and a UTF-8 BOM is added at download time — Excel needs both to read Arabic.
  return lines.join('\r\n');
}

// ---------------------------------------------------------------------------
// One case per shape
// ---------------------------------------------------------------------------

const UNIT_LABEL: Readonly<Record<Unit, string>> = {
  iqd: 'Value (IQD)',
  percent: 'Value (%)',
  count: 'Count',
};

/**
 * A long, tidy table rather than the chart's own layout.
 *
 * Every shape becomes rows of labelled values, because the thing a reader does with this
 * is pivot it. Wide formats — a column per series, a column per month — look closer to the
 * chart and are worse to work with, and they need a different shape of header for each of
 * the fifteen.
 */
export function tableFor(data: ChartData): CsvTable {
  const value = UNIT_LABEL[data.unit];

  switch (data.shape) {
    case 'timeSeries':
      return {
        columns: ['Series', 'Period', value],
        rows: data.series.flatMap((series) =>
          series.points.map((point) => [series.label, point.t, point.v] as const),
        ),
      };

    case 'breakdown':
      return {
        columns: ['Category', 'Part', value, 'Share of total (%)'],
        rows: data.slices.flatMap((slice) => {
          const share = data.total === 0 ? 0 : round((slice.value / data.total) * 100);
          // A ladder's buckets are themselves stacked; each part earns its own row, and
          // the bucket total is not repeated as a row of its own to be double-counted.
          if (slice.parts && slice.parts.length > 0) {
            return slice.parts.map(
              (part) =>
                [
                  slice.label,
                  part.label,
                  part.value,
                  data.total === 0 ? 0 : round((part.value / data.total) * 100),
                ] as const,
            );
          }
          return [[slice.label, '', slice.value, share] as const];
        }),
      };

    case 'ranked':
      return {
        columns: ['Rank', 'Item', value, 'Cumulative share (%)'],
        rows: data.items.map(
          (item, index) => [index + 1, item.label, item.value, item.cumulativePct] as const,
        ),
      };

    case 'matrix':
      return {
        columns: [data.rowLabel ?? 'Row', data.colLabel ?? 'Column', value, 'Status'],
        rows: data.cells.map((c) => [c.row, c.col, c.value, c.status ?? ''] as const),
      };

    case 'funnelSteps':
      return {
        columns: ['Step', value, 'Conversion from previous (%)'],
        rows: data.steps.map((step) => [step.label, step.value, step.conversionPct] as const),
      };

    case 'distribution': {
      // Two populated sets, and only one is ever filled for a given block.
      if (data.bins.length > 0) {
        return {
          columns: ['Series', 'From', 'To', 'Count'],
          rows: data.bins.flatMap((bin) =>
            bin.counts.map(
              (count, index) =>
                [data.seriesLabels[index] ?? `Series ${index + 1}`, bin.from, bin.to, count] as const,
            ),
          ),
        };
      }
      return {
        columns: ['Group', 'Minimum', 'Q1', 'Median', 'Q3', 'Maximum'],
        rows: data.groups.map(
          (group) => [group.label, group.min, group.q1, group.median, group.q3, group.max] as const,
        ),
      };
    }

    case 'flows': {
      const name = new Map(data.nodes.map((node) => [node.id, node.label]));
      return {
        columns: ['From', 'To', value],
        rows: data.links.map(
          (link) => [name.get(link.from) ?? link.from, name.get(link.to) ?? link.to, link.value] as const,
        ),
      };
    }

    case 'scatterPoints':
      return {
        columns: ['Point', data.xLabel, data.yLabel, 'Size'],
        rows: data.points.map(
          (point) => [point.label, point.x, point.y, point.size ?? ''] as const,
        ),
      };

    case 'gaugeSet':
      return {
        columns: ['Measure', value, 'Minimum', 'Maximum', 'Target', 'Regulatory floor'],
        rows: data.gauges.map(
          (gauge) =>
            [
              gauge.label,
              gauge.value,
              gauge.min,
              gauge.max,
              gauge.target ?? '',
              gauge.floor ?? '',
            ] as const,
        ),
      };

    case 'bulletRows':
      return {
        columns: ['Measure', value, 'Target', 'Bands'],
        rows: data.rows.map(
          (row) => [row.label, row.value, row.target, row.ranges.join(' / ')] as const,
        ),
      };

    case 'tableRows': {
      const flagged = new Set(data.flagged ?? []);
      const hasFlags = flagged.size > 0;
      return {
        columns: [...data.columns.map((column) => column.label), ...(hasFlags ? ['Flagged'] : [])],
        rows: data.rows.map((row) => {
          const cells = data.columns.map((column) => row[column.key] ?? '');
          if (!hasFlags) return cells;
          const key = data.columns[0] ? String(row[data.columns[0].key] ?? '') : '';
          return [...cells, flagged.has(key) ? 'yes' : ''];
        }),
      };
    }

    case 'waterfallSteps': {
      // The running total is the column a reader reaches for, and it is exactly what the
      // chart draws, so it is written rather than left to be reconstructed.
      let running = 0;
      return {
        columns: ['Step', 'Kind', value, 'Running total'],
        rows: data.steps.map((step) => {
          if (step.kind === 'start') running = step.value;
          else if (step.kind === 'delta') running += step.value;
          return [step.label, step.kind, step.value, round(running)] as const;
        }),
      };
    }

    case 'geoPoints':
      return {
        columns: ['Location', value, 'Longitude', 'Latitude'],
        rows: data.points.map(
          (point) => [point.label, point.value, point.lon, point.lat] as const,
        ),
      };

    case 'kpiSet':
      // A KPI set carries its own unit per card, so the header cannot name one.
      return {
        columns: ['Measure', 'Value', 'Unit', 'Month on month (%)'],
        rows: data.cards.map(
          (card) => [card.label, card.value, card.unit, card.deltaPct ?? ''] as const,
        ),
      };

    case 'scenarioSet':
      return {
        columns: ['Scenario', value, 'Change vs baseline', 'Low', 'High', 'Baseline'],
        rows: data.scenarios.map(
          (scenario) =>
            [
              scenario.label,
              scenario.value,
              scenario.delta,
              scenario.low ?? '',
              scenario.high ?? '',
              data.baseline,
            ] as const,
        ),
      };
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// The file
// ---------------------------------------------------------------------------

/**
 * A block's whole export: one table per panel, with a header block naming what slice this
 * is.
 *
 * The header matters more than it looks. A CSV that leaves the building with no record of
 * its period, branch, division and currency is a column of numbers somebody will later
 * read as the whole bank. Every figure in it is synthetic, which is stated in the file
 * rather than only on the screen it came from.
 */
export function csvForBlock({
  id,
  title,
  slice,
  asOf,
  panels,
}: {
  id: string;
  title: string;
  /** The resolved view, in words — `describeFilters` of the block's own view. */
  slice: string;
  asOf: string;
  panels: readonly { readonly label: string; readonly data: ChartData }[];
}): string {
  const meta: CsvTable = {
    columns: ['Field', 'Value'],
    rows: [
      ['Insight', `${id} — ${title}`],
      ['Slice', slice],
      ['Data as of', asOf],
      ['Source', 'RTB Business Intelligence demonstration — synthetic data, not RTB figures'],
    ],
  };

  const blocks = [toCsv(meta)];
  for (const panel of panels) {
    blocks.push('');
    if (panels.length > 1) blocks.push(toCsv({ columns: [panel.label], rows: [] }));
    blocks.push(toCsv(tableFor(panel.data)));
  }
  return blocks.join('\r\n');
}

/** Safe on every filesystem, and still recognisable. */
export function csvFilename(id: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${id}${slug ? `-${slug}` : ''}.csv`;
}

/**
 * Hands the browser a file. No network, no store — an object URL, revoked immediately.
 *
 * The BOM is not optional: without it Excel reads the file as the local codepage and the
 * Arabic in PRD §9's brief arrives as mojibake.
 */
export function downloadCsv(filename: string, contents: string): void {
  const blob = new Blob([`﻿${contents}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
