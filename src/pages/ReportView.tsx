import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageBody } from '../components/layout/AppShell.tsx';
import { ReportBlockCard } from '../components/reports/ReportBlockCard.tsx';
import { EditableTitle } from '../components/reports/EditableTitle.tsx';
import { ConfirmButton } from '../components/reports/ConfirmButton.tsx';
import { ShareLink } from '../components/reports/ShareLink.tsx';
import { useReports } from '../reports/ReportsContext.tsx';
import { dropTargetIndex, edgeFor, toBlockRows, type DropEdge } from '../reports/layout.ts';
import { BlockPicker } from '../components/reports/BlockPicker.tsx';
import { starterBlocks, BLOCKS } from '../reports/catalogue.ts';
import { useFilters } from '../state/FiltersContext.tsx';
import { describeFilters } from '../data/filters.ts';
import { ASOF } from '../data/bank.ts';
import { formatDateLong } from '../design/format.ts';

/**
 * One report.
 *
 * The page is a document, not a dashboard: a name the reader owns, a line saying what
 * slice it is reading, and the blocks in the order they put them in. The header filters
 * apply to every block that has not overridden them (I7), so the whole report re-reads as
 * one when the reader changes the period.
 */
export function ReportView() {
  const { id = '' } = useParams<{ id: string }>();
  const {
    get,
    rename,
    addBlock,
    removeBlock,
    duplicateBlock,
    moveBlock,
    setBlockScope,
    setBlockTitle,
    remove,
    usage,
  } = useReports();
  const [picking, setPicking] = useState(false);
  /*
   * Which block is being dragged, and which one the pointer is over.
   *
   * Held here rather than in each card because the answer is about the pair. Kept to two
   * small pieces of state on purpose: the cards' charts are memoised on the data they read,
   * so a drag re-renders card frames and does not rebuild a single Recharts tree.
   */
  const [dragId, setDragId] = useState<string | undefined>(undefined);
  const [over, setOver] = useState<{ id: string; edge: DropEdge } | undefined>(undefined);
  const { filters } = useFilters();
  const report = get(id);

  // A report id from a stale link, or from a session that has since been refreshed away.
  if (!report) return <Navigate to="/reports" replace />;

  const rows = toBlockRows(report.blocks);

  function endDrag(): void {
    setDragId(undefined);
    setOver(undefined);
  }

  // A local binding, because a hoisted function declaration does not keep the narrowing
  // the early return above established.
  const blocks = report.blocks;
  const reportId = report.id;

  function dropOn(targetId: string, edge: DropEdge): void {
    if (!dragId) return;
    const from = blocks.findIndex((block) => block.id === dragId);
    const target = blocks.findIndex((block) => block.id === targetId);
    if (from >= 0 && target >= 0) {
      moveBlock(reportId, dragId, dropTargetIndex(from, target, edge));
    }
    endDrag();
  }
  // What is already here, so a picker row can say so without forbidding a second copy.
  const inReport = useMemo(() => {
    const counts = new Map<string, number>();
    for (const block of report.blocks) {
      counts.set(block.blockId, (counts.get(block.blockId) ?? 0) + 1);
    }
    return counts;
  }, [report.blocks]);

  return (
    <PageBody>
      <header className="mb-6 border-b-2 border-navy pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <EditableTitle
            value={report.name}
            onChange={(name) => rename(report.id, name)}
            className="text-h1 text-navy"
          />
          {/* None of this row belongs on paper: the printed page is the report itself. */}
          <div className="flex items-start gap-4 print:hidden">
            <ShareLink report={report} />
            <button
              type="button"
              data-picker-opener
              onClick={() => setPicking(true)}
              className="flex items-center gap-1.5 rounded-chip bg-navy px-3 py-1.5 text-micro font-bold text-surface hover:bg-accent"
            >
              <Plus size={13} strokeWidth={3} aria-hidden /> Add blocks
            </button>
            <Link to="/reports" className="text-micro font-bold text-accent hover:underline">
              All reports
            </Link>
            <ConfirmButton
              label="Delete report"
              confirmLabel="Delete for good?"
              onConfirm={() => remove(report.id)}
            />
          </div>
        </div>
        <p className="mt-2 text-micro text-muted">
          {report.blocks.length} {report.blocks.length === 1 ? 'block' : 'blocks'} · Data as of{' '}
          {formatDateLong(ASOF)} · {describeFilters(filters)}
        </p>
        {/*
          * Said once, plainly, on the page itself.
          *
          * Nothing is stored anywhere (PRD §4 rules out every browser store, and there is
          * no server), so a refresh loses the report. A reader who finds that out by
          * losing work has been misled by the page; a reader who is told has a way to keep
          * it, which is the link.
          */}
        <p className="mt-1 text-micro text-muted">
          Held for this session only — nothing is saved to this machine. Share the link to keep it.
        </p>
      </header>

      {report.blocks.length === 0 ? (
        <Empty onAdd={(blockId) => addBlock(report.id, blockId)} onBrowse={() => setPicking(true)} />
      ) : (
        <>
          <div className="space-y-10">
            {rows.map((row) => (
              <div
                key={row[0]?.id}
                className={`grid gap-x-8 gap-y-10 ${row.length === 2 ? 'xl:grid-cols-2' : ''}`}
              >
                {row.map((block) => (
                  <ReportBlockCard
                    key={block.id}
                    block={block}
                    header={filters}
                    // Position in the whole report, not in this row — the move items step
                    // through the report's order, which is what the packer reads.
                    index={report.blocks.indexOf(block)}
                    count={report.blocks.length}
                    actions={{
                      onScope: (scope) => setBlockScope(report.id, block.id, scope),
                      onTitle: (title) => setBlockTitle(report.id, block.id, title),
                      onDuplicate: () => duplicateBlock(report.id, block.id),
                      onMove: (to) => moveBlock(report.id, block.id, to),
                      onRemove: () => removeBlock(report.id, block.id),
                    }}
                    drag={{
                      isDragging: dragId === block.id,
                      ...(over?.id === block.id && dragId !== block.id
                        ? { edge: over.edge }
                        : {}),
                      onDragStart: (event) => {
                        setDragId(block.id);
                        event.dataTransfer.effectAllowed = 'move';
                        // Some browsers cancel a drag that carries no payload.
                        event.dataTransfer.setData('text/plain', block.id);
                      },
                      onDragEnd: endDrag,
                      onDragOver: (event) => {
                        if (!dragId || dragId === block.id) return;
                        // Without preventDefault the drop event never fires at all.
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        const element = event.currentTarget as HTMLElement;
                        const rtl = getComputedStyle(element).direction === 'rtl';
                        const edge = edgeFor(
                          element.getBoundingClientRect(),
                          event.clientX,
                          rtl,
                        );
                        setOver((current) =>
                          current?.id === block.id && current.edge === edge
                            ? current
                            : { id: block.id, edge },
                        );
                      },
                      onDragLeave: () =>
                        setOver((current) => (current?.id === block.id ? undefined : current)),
                      onDrop: (event) => {
                        event.preventDefault();
                        dropOn(block.id, over?.edge ?? 'after');
                      },
                      onKeyDown: (event) => {
                        // The keyboard route, since HTML5 drag has none.
                        const at = report.blocks.indexOf(block);
                        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                          event.preventDefault();
                          moveBlock(report.id, block.id, at - 1);
                        } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                          event.preventDefault();
                          moveBlock(report.id, block.id, at + 1);
                        }
                      },
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <BlockPicker
        open={picking}
        onClose={() => setPicking(false)}
        onAdd={(blockId) => addBlock(report.id, blockId)}
        usage={usage}
        inReport={inReport}
      />
    </PageBody>
  );
}

/**
 * An empty report offers four blocks of four different shapes.
 *
 * A single "add a block" button on a blank page teaches nothing about what a report can
 * hold, and four suggestions that all look alike teach almost as little.
 */
function Empty({ onAdd, onBrowse }: { onAdd: (blockId: string) => void; onBrowse: () => void }) {
  return (
    <div className="max-w-3xl">
      <h3 className="text-h2 text-navy">Nothing in this report yet</h3>
      <p className="mt-1 text-body text-muted">
        Start from one of these, or pick anything from the {BLOCKS.length} in the catalogue.
      </p>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {starterBlocks().map((block) => (
          <li key={block.id} className="flex items-start justify-between gap-6 py-3">
            <div className="min-w-0">
              <p className="text-h2 text-navy">{block.label}</p>
              <p className="mt-0.5 text-micro text-muted">
                {block.section} · {block.vizLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAdd(block.id)}
              className="flex shrink-0 items-center gap-1 rounded-chip bg-navy px-2.5 py-1 text-micro font-bold text-surface hover:bg-accent"
            >
              <Plus size={12} strokeWidth={3} aria-hidden /> Add
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        data-picker-opener
        onClick={onBrowse}
        className="mt-6 flex items-center gap-1.5 rounded-chip bg-navy px-3 py-1.5 text-micro font-bold text-surface hover:bg-accent"
      >
        <Plus size={13} strokeWidth={3} aria-hidden /> Browse all {BLOCKS.length}
      </button>
    </div>
  );
}
