import { memo, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GripVertical, X } from 'lucide-react';
import type { Filters } from '../../types.ts';
import { tryById } from '../../data/insights.ts';
import { seriesFor } from '../../data/seriesFor.ts';
import { ASOF } from '../../data/bank.ts';
import { describeFilters } from '../../data/filters.ts';
import { csvForBlock, csvFilename, downloadCsv } from '../../reports/csv.ts';
import { BlockMenu, type BlockMenuActions } from './BlockMenu.tsx';
import { findingFor } from '../../data/finding.ts';
import { IdChip } from '../ui/Badge.tsx';
import { Emphasis } from '../ui/Emphasis.tsx';
import { InsightDisclosures, InsightPanels } from '../insight/InsightBody.tsx';
import { GenerateInsightsButton } from '../insight/GenerateInsightsButton.tsx';
import { useInsightsControls } from '../../state/InsightsPanelContext.tsx';
import { useReveal } from '../../design/useReveal.ts';
import type { ReportBlock } from '../../reports/model.ts';
import { describeScope, ignoredScopeNote, viewForBlock } from '../../reports/scope.ts';
import type { DropEdge } from '../../reports/layout.ts';

/**
 * One block on a report page.
 *
 * The same insight, the same charts, the same disclosures as its home page — the card
 * body is shared, not copied (`InsightBody`). Three things differ, and all three are
 * about a block having a life of its own:
 *
 *   - **Scope chips** (I3). A block whose slice differs from the header says so on its own
 *     face, in the reader's words. Without this a report is a page of figures that look
 *     like they answer the same question and do not.
 *   - **A title the reader can set.** Absent means the insight's own title.
 *   - **Ignored dimensions are admitted.** A chip for a filter the block compares across
 *     is shown struck through, and the sentence explaining why goes into "How this is
 *     calculated" — where a caveat about the figures belongs.
 */
export const ReportBlockCard = memo(function ReportBlockCard({
  block,
  header,
  onRemove,
  index = 0,
  count = 1,
  actions,
  drag,
  height = 240,
}: {
  block: ReportBlock;
  /** The report page's own filter selection, which the block's scope overrides per dimension. */
  header: Filters;
  onRemove?: () => void;
  /** Position in the report — the menu's move items need to know where the ends are. */
  index?: number;
  count?: number;
  actions?: BlockMenuActions;
  drag?: DragProps;
  height?: number;
}) {
  const insight = tryById(block.blockId);
  const [revealRef, revealClass] = useReveal<HTMLElement>();

  // Override the header, then strip what this block compares across (I7 then I6).
  const view = useMemo(
    () => (insight ? viewForBlock(insight, header, block.scope) : header),
    [insight, header, block.scope],
  );
  const finding = useMemo(
    () => (insight ? findingFor(seriesFor(insight.id, 0, view)) : undefined),
    [insight, view],
  );
  const chips = useMemo(
    () => (insight ? describeScope(insight, header, block.scope) : []),
    [insight, header, block.scope],
  );

  /*
   * A block's slice is its own, so the panel is opened against `view` rather than the page's
   * filters — and it has to keep following it. Changing the report header re-resolves `view`
   * here, and the panel would otherwise be left describing the scope the block had when it
   * was opened. `sync` is a no-op unless this block is the one open.
   */
  const { sync } = useInsightsControls();
  useEffect(() => {
    if (insight) sync(insight.id, view);
  }, [insight, view, sync]);

  /*
   * I8 by construction: the export reads the *same* `seriesFor(id, panel, view)` the charts
   * above it were handed, for every panel. There is no second resolution of the scope, so
   * there is nothing to drift — and no way to export a slice that was never on screen.
   */
  function exportCsv(): void {
    if (!insight) return;
    downloadCsv(
      csvFilename(insight.id, block.title ?? insight.title),
      csvForBlock({
        id: insight.id,
        title: block.title ?? insight.title,
        slice: describeFilters(view),
        asOf: ASOF,
        panels: insight.panels.map((panel, panelIndex) => ({
          label: `${panel.component}${panel.variant ? ` — ${panel.variant}` : ''}`,
          data: seriesFor(insight.id, panelIndex, view),
        })),
      }),
    );
  }

  if (!insight) return <MissingBlock id={block.blockId} onRemove={onRemove} />;

  const note = ignoredScopeNote(chips);

  return (
    <article
      ref={revealRef}
      className={`group relative flex flex-col bg-surface ${revealClass} ${
        drag?.isDragging ? 'opacity-40' : ''
      }`}
      style={{ breakInside: 'avoid' }}
      {...(drag
        ? {
            onDragOver: drag.onDragOver,
            onDragLeave: drag.onDragLeave,
            onDrop: drag.onDrop,
          }
        : {})}
    >
      {/*
        * The insertion line, on the card the pointer is over.
        *
        * Drawn on the *target* rather than by moving the cards themselves. Shuffling a grid
        * of charts under the pointer would rebuild Recharts trees on every mouse move, and
        * a 2px rule says where the block will land just as clearly.
        */}
      {drag?.edge && (
        <span
          aria-hidden
          className={`absolute inset-y-0 w-0.5 bg-cyan ${drag.edge === 'before' ? 'start-0 -ms-3' : 'end-0 -me-3'}`}
        />
      )}
      <header className="border-t-2 border-t-line px-4 pb-3 pt-3">
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {drag && (
              <button
                type="button"
                draggable
                onDragStart={drag.onDragStart}
                onDragEnd={drag.onDragEnd}
                onKeyDown={drag.onKeyDown}
                aria-label={`Reorder ${block.title ?? insight.title} — position ${index + 1} of ${count}. Use the arrow keys, or drag.`}
                title="Drag to reorder, or use the arrow keys"
                className="-ms-1 shrink-0 cursor-grab rounded-chip p-0.5 text-muted opacity-0 transition-opacity hover:bg-canvas hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
              >
                <GripVertical size={13} strokeWidth={2.5} aria-hidden />
              </button>
            )}
            <IdChip id={insight.id} />
            {chips.map((chip) => (
              <span
                key={chip.key}
                data-chip={chip.ignored ? 'ignored' : 'scope'}
                className={
                  chip.ignored
                    ? 'rounded-chip border border-line px-1.5 py-0.5 text-micro text-muted line-through decoration-muted'
                    : 'rounded-chip bg-navy px-1.5 py-0.5 text-micro font-bold text-surface'
                }
                title={
                  chip.ignored
                    ? 'This block compares across this dimension, so the selection does not apply to it'
                    : 'This block uses its own selection, not the one above'
                }
              >
                {chip.label}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1">
          {actions ? (
            <BlockMenu
              block={block}
              insight={insight}
              index={index}
              count={count}
              actions={actions}
              onCsv={exportCsv}
            />
          ) : (
            onRemove && (
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove ${block.title ?? insight.title} from this report`}
                title="Remove from this report"
                className="shrink-0 rounded-chip p-1 text-muted opacity-0 transition-opacity hover:bg-canvas hover:text-negative focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X size={14} strokeWidth={2.5} aria-hidden />
              </button>
            )
          )}
          </div>
        </div>

        <Link to={`/insight/${insight.id}`} className="block">
          <h3 className="text-h2 text-navy group-hover:text-accent">{block.title ?? insight.title}</h3>
        </Link>
        {/* The reader's own title replaces the insight's; the original stays available. */}
        {block.title !== undefined && (
          <p className="mt-0.5 text-micro text-muted">{insight.title}</p>
        )}

        {finding && (
          <p className="mt-1.5 max-w-3xl text-body leading-snug text-ink">
            <Emphasis text={finding} />
          </p>
        )}
      </header>

      <div className="flex-1 px-4 pb-3">
        <InsightPanels insight={insight} filters={view} height={height} />
      </div>

      {/* The same footer line as a section card, opened against the block's own slice. */}
      <footer className="flex items-end justify-between gap-4 px-4 pb-4">
        <div className="min-w-0 flex-1">
          <InsightDisclosures insight={insight} {...(note !== undefined ? { note } : {})} />
        </div>
        <GenerateInsightsButton insight={insight} filters={view} />
      </footer>
    </article>
  );
});

/**
 * The handle's own props.
 *
 * `draggable` is on the **handle**, not the card. On the card, selecting a figure to copy or
 * dragging across a chart would start a reorder — and a report is something people read and
 * quote from far more often than they rearrange.
 *
 * The handle also answers the arrow keys, because HTML5 drag is mouse-only: it does not fire
 * for touch at all, and there is no keyboard equivalent. Without that, reordering would be
 * reachable only through the ⋮ menu, which works but is three interactions deep for
 * something the mouse does in one.
 */
export interface DragProps {
  readonly isDragging: boolean;
  /** Set on the block the pointer is over, and only on that one. */
  readonly edge?: DropEdge;
  readonly onDragStart: (event: React.DragEvent) => void;
  readonly onDragEnd: () => void;
  readonly onDragOver: (event: React.DragEvent) => void;
  readonly onDragLeave: () => void;
  readonly onDrop: (event: React.DragEvent) => void;
  readonly onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * A block id this build does not know — an old share link naming an insight that has
 * since been renumbered.
 *
 * It says which id and offers to remove it, rather than leaving a gap the reader has to
 * work out. Silently dropping it would be worse: the report would quietly differ from the
 * one that was sent.
 */
function MissingBlock({ id, onRemove }: { id: string; onRemove?: (() => void) | undefined }) {
  return (
    <article className="flex flex-col bg-surface" style={{ breakInside: 'avoid' }}>
      <div className="border-t-2 border-t-line px-4 pb-4 pt-3">
        <IdChip id={id} />
        <h3 className="mt-1.5 text-h2 text-muted">No longer in this build</h3>
        <p className="mt-1 max-w-prose text-micro leading-relaxed text-muted">
          This report was made with a version that had an insight numbered{' '}
          <span className="font-bold text-ink">{id}</span>. It is not in the catalogue now, so there
          is nothing to draw. The rest of the report is unaffected.
        </p>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-2 text-micro font-bold text-accent hover:underline"
          >
            Remove it
          </button>
        )}
      </div>
    </article>
  );
}
