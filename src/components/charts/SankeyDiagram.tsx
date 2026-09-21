import { useState } from 'react';
import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { FlowsData } from '../../types.ts';
import { seriesColor, tokens } from '../../design/tokens.ts';
import { formatValue, formatValueFull } from '../../design/format.ts';
import { ChartFrame, ChartNote, TooltipShell } from './common.tsx';

interface Placed {
  readonly id: string;
  readonly label: string;
  readonly side: 'source' | 'target';
  readonly value: number;
  readonly top: number;
  readonly height: number;
}

/**
 * Hand-rolled (PRD §4). Variant: `plain`.
 *
 * Two columns, because every flow in the catalogue is source → target: salary into
 * spend categories, delinquency bucket into bucket, rating into rating. Node height
 * and ribbon thickness are both proportional to value, which is the only thing a
 * Sankey encodes.
 */
export function SankeyDiagram({ data, height, compact = false }: ChartProps) {
  const flows = data.shape === 'flows' ? (data as FlowsData) : undefined;
  const resolved = resolveHeight({ height, compact });
  const [hovered, setHovered] = useState<number | undefined>(undefined);

  if (!flows || flows.links.length === 0 || flows.nodes.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Sankey diagram">{null}</ChartFrame>;
  }

  const gap = compact ? 2 : 6;
  const nodeWidth = compact ? 6 : 8;
  const plotHeight = resolved;

  const sourceIds = [...new Set(flows.links.map((link) => link.from))];
  const targetIds = [...new Set(flows.links.map((link) => link.to))];
  const labelOf = new Map(flows.nodes.map((node) => [node.id, node.label]));

  const totalFor = (id: string, side: 'source' | 'target'): number =>
    flows.links
      .filter((link) => (side === 'source' ? link.from === id : link.to === id))
      .reduce((sum, link) => sum + link.value, 0);

  const layout = (ids: readonly string[], side: 'source' | 'target'): Placed[] => {
    const totals = ids.map((id) => totalFor(id, side));
    const sum = totals.reduce((acc, value) => acc + value, 0) || 1;
    const available = plotHeight - gap * Math.max(0, ids.length - 1);
    let cursor = 0;
    return ids.map((id, index) => {
      const value = totals[index] ?? 0;
      const nodeHeight = Math.max(2, (value / sum) * available);
      const placed: Placed = {
        id,
        label: labelOf.get(id) ?? id,
        side,
        value,
        top: cursor,
        height: nodeHeight,
      };
      cursor += nodeHeight + gap;
      return placed;
    });
  };

  const sources = layout(sourceIds, 'source');
  const targets = layout(targetIds, 'target');
  const byId = new Map([...sources, ...targets].map((node) => [node.id, node]));

  // Ribbons stack down each node in link order, so they never overlap.
  const sourceOffset = new Map<string, number>();
  const targetOffset = new Map<string, number>();

  const ribbons = flows.links.map((link, index) => {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (!from || !to) return null;

    const fromShare = (link.value / (from.value || 1)) * from.height;
    const toShare = (link.value / (to.value || 1)) * to.height;
    const y0 = from.top + (sourceOffset.get(link.from) ?? 0);
    const y1 = to.top + (targetOffset.get(link.to) ?? 0);
    sourceOffset.set(link.from, (sourceOffset.get(link.from) ?? 0) + fromShare);
    targetOffset.set(link.to, (targetOffset.get(link.to) ?? 0) + toShare);

    const colourIndex = sourceIds.indexOf(link.from);
    return { link, index, y0, y1, fromShare, toShare, colourIndex };
  });

  const hoveredRibbon = ribbons.find((ribbon) => ribbon?.index === hovered);

  return (
    <>
      <div className="relative" style={{ height: resolved }}>
        <svg width="100%" height={plotHeight} viewBox={`0 0 100 ${plotHeight}`} preserveAspectRatio="none" role="img" aria-label="Sankey diagram">
          {ribbons.map((ribbon) => {
            if (!ribbon) return null;
            const left = nodeWidth;
            const right = 100 - nodeWidth;
            const mid = (left + right) / 2;
            const path = [
              `M ${left} ${ribbon.y0}`,
              `C ${mid} ${ribbon.y0}, ${mid} ${ribbon.y1}, ${right} ${ribbon.y1}`,
              `L ${right} ${ribbon.y1 + ribbon.toShare}`,
              `C ${mid} ${ribbon.y1 + ribbon.toShare}, ${mid} ${ribbon.y0 + ribbon.fromShare}, ${left} ${ribbon.y0 + ribbon.fromShare}`,
              'Z',
            ].join(' ');
            return (
              <path
                key={`${ribbon.link.from}-${ribbon.link.to}`}
                d={path}
                fill={seriesColor(ribbon.colourIndex)}
                opacity={hovered === undefined ? 0.4 : hovered === ribbon.index ? 0.85 : 0.15}
                onMouseEnter={() => setHovered(ribbon.index)}
                onMouseLeave={() => setHovered(undefined)}
              />
            );
          })}
          {sources.map((node, index) => (
            <rect key={node.id} x={0} y={node.top} width={nodeWidth} height={node.height} fill={seriesColor(index)} />
          ))}
          {targets.map((node) => (
            <rect key={node.id} x={100 - nodeWidth} y={node.top} width={nodeWidth} height={node.height} fill={tokens.color.muted} />
          ))}
        </svg>

        {!compact && (
          <div className="pointer-events-none absolute inset-0">
            {sources.map((node) => (
              <span
                key={node.id}
                className="absolute truncate ps-2 text-micro text-ink"
                style={{ top: node.top, left: `${nodeWidth}%`, maxWidth: '38%' }}
              >
                {node.label}
              </span>
            ))}
            {targets.map((node) => (
              <span
                key={node.id}
                className="absolute truncate pe-2 text-end text-micro text-ink"
                style={{ top: node.top, right: `${nodeWidth}%`, maxWidth: '38%' }}
              >
                {node.label}
              </span>
            ))}
          </div>
        )}

        {hoveredRibbon && (
          <div className="pointer-events-none absolute start-1/2 top-0 z-10 -translate-x-1/2">
            <TooltipShell
              title={`${byId.get(hoveredRibbon.link.from)?.label ?? ''} → ${byId.get(hoveredRibbon.link.to)?.label ?? ''}`}
              rows={[{ label: 'Flow', value: formatValueFull(hoveredRibbon.link.value, flows.unit) }]}
            />
          </div>
        )}
      </div>
      {!compact && (
        <p className="mt-1 text-micro text-muted">
          Total flow {formatValue(sources.reduce((sum, node) => sum + node.value, 0), flows.unit, { compact: true })}
        </p>
      )}
      <ChartNote note={flows.note} />
    </>
  );
}
