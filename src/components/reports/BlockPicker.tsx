import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { IdChip } from '../ui/Badge.tsx';
import { ShapeGlyph, SHAPE_LABEL } from './ShapeGlyph.tsx';
import {
  blockGroups,
  searchBlocks,
  suggestedBlocks,
  BLOCKS,
  type BlockDef,
} from '../../reports/catalogue.ts';

/**
 * The picker. A drawer down the side, not a centred modal.
 *
 * The reader's question while picking is "what goes next to what I already have", and a
 * modal answers it by covering the answer up. A drawer leaves the report on screen, so
 * they can see the page fill in behind them — which also means **it does not close on
 * add**. Picking four blocks is the normal case, not the exception, and a picker that
 * shuts after each one turns that into four round trips.
 *
 * Search is `searchBlocks` from the catalogue, the same scoring the ⌘K palette uses: an
 * exact id, then an id prefix, then a title prefix, then anywhere.
 */
export function BlockPicker({
  open,
  onClose,
  onAdd,
  usage,
  inReport,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (blockId: string) => void;
  /** Across all of the reader's reports — drives "you use these". */
  usage: ReadonlyMap<string, number>;
  /** How many times each block is already on *this* report. */
  inReport: ReadonlyMap<string, number>;
}) {
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<readonly string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const searching = query.trim().length > 0;
  const results = useMemo(() => (searching ? searchBlocks(query) : []), [query, searching]);
  const groups = useMemo(() => (searching ? [] : blockGroups()), [searching]);
  const suggested = useMemo(() => (searching ? [] : suggestedBlocks(usage, 4)), [searching, usage]);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    setQuery('');
    setAdded([]);

    /*
     * Closing has to put focus back somewhere deliberate, or a keyboard reader lands on
     * `<body>` and tabs from the top of the document again.
     *
     * Returning it to whatever was focused is not enough on its own. The button that
     * opens this drawer from an *empty* report is inside the empty state, which the first
     * added block removes — so by the time the drawer closes the remembered element is
     * detached, and focusing a detached node silently does nothing. Hence the
     * `isConnected` test and the fallback to whichever opener is on the page now.
     */
    return () => {
      const remembered = previouslyFocused.current;
      if (remembered?.isConnected) {
        remembered.focus();
        return;
      }
      const opener = document.querySelector<HTMLElement>('[data-picker-opener]');
      opener?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    /*
     * Escape closes, and Tab stays inside.
     *
     * The trap is here because `aria-modal="true"` is a promise to a screen reader that
     * nothing outside this panel is reachable. Without it the promise is false: Tab walks
     * straight out into the report behind, and a reader using the keyboard ends up editing
     * a page they were told they could not see.
     */
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.hasAttribute('disabled'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function add(block: BlockDef): void {
    onAdd(block.id);
    // A brief confirmation on the row itself. Without it, adding a block whose card lands
    // below the fold gives no sign anything happened.
    setAdded((current) => [...current, block.id]);
    window.setTimeout(() => {
      setAdded((current) => current.filter((id) => id !== block.id));
    }, 1400);
  }

  return (
    <>
      {/* Dimmed, but lightly: the report behind is the thing being built. */}
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={onClose} aria-hidden />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add a block"
        className="fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col border-s border-line bg-surface shadow-lg"
      >
        <header className="border-b border-line px-4 pb-3 pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-h1 text-navy">Add a block</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-chip p-1 text-muted hover:bg-canvas hover:text-ink"
            >
              <X size={15} strokeWidth={2.5} aria-hidden />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-chip border border-line px-2 py-1.5">
            <Search size={14} className="shrink-0 text-muted" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${BLOCKS.length} insights…`}
              aria-label="Search insights"
              className="w-full bg-transparent text-body text-ink outline-none placeholder:text-muted"
            />
            {searching && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="shrink-0 text-micro font-bold text-accent hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {searching ? (
            results.length === 0 ? (
              <p className="px-4 py-8 text-center text-body text-muted">
                Nothing matches “{query.trim()}”.
              </p>
            ) : (
              <Section label={`${results.length} of ${BLOCKS.length}`}>
                {results.map((block) => (
                  <Row
                    key={block.id}
                    block={block}
                    onAdd={add}
                    justAdded={added.includes(block.id)}
                    count={inReport.get(block.id) ?? 0}
                  />
                ))}
              </Section>
            )
          ) : (
            <>
              {suggested.length > 0 && (
                <Section label="You use these">
                  {suggested.map((block) => (
                    <Row
                      key={block.id}
                      block={block}
                      onAdd={add}
                      justAdded={added.includes(block.id)}
                      count={inReport.get(block.id) ?? 0}
                    />
                  ))}
                </Section>
              )}
              {groups.map((group) => (
                <Section key={group.key} label={`${group.label} · ${group.blocks.length}`}>
                  {group.blocks.map((block) => (
                    <Row
                      key={block.id}
                      block={block}
                      onAdd={add}
                      justAdded={added.includes(block.id)}
                      count={inReport.get(block.id) ?? 0}
                    />
                  ))}
                </Section>
              ))}
            </>
          )}
        </div>

        <footer className="border-t border-line px-4 py-2 text-micro text-muted">
          Stays open so you can add several · esc to close
        </footer>
      </aside>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      {/* Sticky, because a list of 54 rows otherwise loses which layer you are in. */}
      <h3 className="sticky top-0 z-10 border-b border-line bg-canvas px-4 py-1.5 text-label text-muted">
        {label}
      </h3>
      <ul className="divide-y divide-line">{children}</ul>
    </section>
  );
}

function Row({
  block,
  onAdd,
  justAdded,
  count,
}: {
  block: BlockDef;
  onAdd: (block: BlockDef) => void;
  justAdded: boolean;
  /** Times this block is already on the report. Not a bar to adding it again. */
  count: number;
}) {
  return (
    <li>
      {/*
        * The whole row adds the block. A row with a small `+` at the end and a dead
        * remainder makes the reader aim; there is nothing else the row could do.
        *
        * Already being on the report does not disable it: the same insight at two
        * different slices is the point of per-block scope (I7), so "on the report ×2" is
        * information, not a warning.
        */}
      <button
        type="button"
        onClick={() => onAdd(block)}
        title={block.description}
        className="group/row flex w-full items-start gap-3 px-4 py-2.5 text-start hover:bg-canvas"
      >
        <span className="mt-0.5">
          <ShapeGlyph shape={block.shape} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <IdChip id={block.id} />
            {count > 0 && (
              <span className="text-micro text-muted">
                on the report{count > 1 ? ` ×${count}` : ''}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-body leading-snug text-ink">{block.label}</span>
          <span className="mt-0.5 block truncate text-micro text-muted">
            {block.section} · {SHAPE_LABEL[block.shape]}
            {block.width === 'full' ? ' · full width' : ''}
          </span>
        </span>
        <span className="mt-0.5 shrink-0">
          {justAdded ? (
            <Check size={14} strokeWidth={3} className="text-positiveInk" aria-hidden />
          ) : (
            <Plus
              size={14}
              strokeWidth={3}
              className="text-muted group-hover/row:text-accent"
              aria-hidden
            />
          )}
        </span>
      </button>
    </li>
  );
}
