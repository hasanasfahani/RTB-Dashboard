import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  MoreVertical,
  Pencil,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { PERIODS, type Filters, type Insight } from '../../types.ts';
import { branches } from '../../data/entities.ts';
import { DIVISIONS_LABEL, PERIOD_LABEL } from '../../data/filters.ts';
import { exemptionsFor } from '../../reports/scope.ts';
import type { BlockScope, ReportBlock } from '../../reports/model.ts';

/**
 * One menu per block, carrying everything a block can have done to it.
 *
 * Deliberately one. Six controls on the face of a card is a toolbar, and a report of twelve
 * blocks then carries seventy-two of them — the page stops reading as a document and starts
 * reading as an editor. The card shows the block; the menu holds the verbs.
 */
/**
 * The verbs the *page* owns — every one of them a call into `model.ts`.
 *
 * `onCsv` is deliberately not here. A CSV has to hold the same view the panel drew (I8),
 * and the only place that view exists is the card, which already built it to render the
 * chart. Passing the export down from the page would mean the page resolving the scope a
 * second time, which is exactly the second query I8 exists to forbid.
 */
export interface BlockMenuActions {
  readonly onScope: (scope?: BlockScope) => void;
  readonly onTitle: (title?: string) => void;
  readonly onDuplicate: () => void;
  readonly onMove: (to: number) => void;
  readonly onRemove: () => void;
}

type Panel = 'menu' | 'scope' | 'title';

export function BlockMenu({
  block,
  insight,
  index,
  count,
  actions,
  onCsv,
}: {
  block: ReportBlock;
  insight: Insight;
  /** Position in the report, for the move items and for disabling them at the ends. */
  index: number;
  count: number;
  actions: BlockMenuActions;
  /** Supplied by the card, which holds the resolved view — see `BlockMenuActions`. */
  onCsv: () => void;
}) {
  const [panel, setPanel] = useState<Panel | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click outside and Escape both close. Anchored to the card, so no backdrop: a backdrop
  // over the report would stop the reader scrolling to the block they were comparing to.
  useEffect(() => {
    if (!panel) return;
    const onDown = (event: MouseEvent): void => {
      if (!wrapRef.current?.contains(event.target as Node)) setPanel(undefined);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setPanel(undefined);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [panel]);

  const close = (): void => setPanel(undefined);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setPanel(panel ? undefined : 'menu')}
        aria-label={`Actions for ${block.title ?? insight.title}`}
        aria-expanded={panel !== undefined}
        className={`rounded-chip p-1 text-muted transition-opacity hover:bg-canvas hover:text-ink focus-visible:opacity-100 ${
          panel ? 'bg-canvas opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <MoreVertical size={15} strokeWidth={2.5} aria-hidden />
      </button>

      {panel === 'menu' && (
        <div
          role="menu"
          className="absolute end-0 top-7 z-30 w-56 rounded-card border border-line bg-surface py-1 shadow-lg"
        >
          <Item icon={<SlidersHorizontal size={13} />} onClick={() => setPanel('scope')}>
            Change this block's slice…
          </Item>
          <Item icon={<Pencil size={13} />} onClick={() => setPanel('title')}>
            {block.title === undefined ? 'Give it your own title…' : 'Edit your title…'}
          </Item>
          <Item
            icon={<Copy size={13} />}
            onClick={() => {
              actions.onDuplicate();
              close();
            }}
          >
            Duplicate
          </Item>

          <Divider />

          <Item
            icon={<ArrowUp size={13} />}
            disabled={index === 0}
            onClick={() => {
              actions.onMove(index - 1);
              close();
            }}
          >
            Move up
          </Item>
          <Item
            icon={<ArrowDown size={13} />}
            disabled={index >= count - 1}
            onClick={() => {
              actions.onMove(index + 1);
              close();
            }}
          >
            Move down
          </Item>

          <Divider />

          <Item
            icon={<Download size={13} />}
            onClick={() => {
              onCsv();
              close();
            }}
          >
            Download CSV
          </Item>
          <Item
            icon={<Trash2 size={13} />}
            tone="negative"
            onClick={() => {
              actions.onRemove();
              close();
            }}
          >
            Remove from report
          </Item>
        </div>
      )}

      {panel === 'scope' && (
        <ScopePanel
          block={block}
          insight={insight}
          onApply={(scope) => {
            actions.onScope(scope);
            close();
          }}
          onBack={() => setPanel('menu')}
        />
      )}

      {panel === 'title' && (
        <TitlePanel
          block={block}
          insight={insight}
          onApply={(title) => {
            actions.onTitle(title);
            close();
          }}
          onBack={() => setPanel('menu')}
        />
      )}
    </div>
  );
}

function Item({
  icon,
  children,
  onClick,
  disabled = false,
  tone,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'negative';
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex w-full items-center gap-2 px-3 py-1.5 text-start text-micro',
        disabled ? 'cursor-not-allowed text-line' : 'hover:bg-canvas',
        tone === 'negative' && !disabled ? 'text-negative' : disabled ? '' : 'text-ink',
      ].join(' ')}
    >
      <span className="shrink-0 text-muted" aria-hidden>
        {icon}
      </span>
      {children}
    </button>
  );
}

function Divider() {
  return <div className="my-1 border-t border-line" aria-hidden />;
}

// ---------------------------------------------------------------------------
// The slice editor
// ---------------------------------------------------------------------------

const INHERIT = '';

/**
 * Four dimensions, each either the page's selection or this block's own (I7).
 *
 * "Same as page" is the first option and the default, and it is a genuinely different state
 * from picking the value the page happens to be showing: the page's selection changes, and
 * a block set to inherit follows it while a block pinned to Basra does not. The model keeps
 * that distinction by **deleting** the key rather than storing a value.
 *
 * A dimension the block compares across is disabled and says why. Offering a branch
 * selector on a block that will ignore it is offering a control that does nothing.
 */
function ScopePanel({
  block,
  insight,
  onApply,
  onBack,
}: {
  block: ReportBlock;
  insight: Insight;
  onApply: (scope?: BlockScope) => void;
  onBack: () => void;
}) {
  const exempt = exemptionsFor(insight);
  const [draft, setDraft] = useState<BlockScope>(block.scope ?? {});

  function set<K extends keyof Filters>(key: K, raw: string): void {
    setDraft((current) => {
      const next = { ...current };
      if (raw === INHERIT) delete next[key];
      else next[key] = raw as Filters[K];
      return next;
    });
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(block.scope ?? {});

  return (
    <div className="absolute end-0 top-7 z-30 w-72 rounded-card border border-line bg-surface p-3 shadow-lg">
      <h4 className="text-h2 text-navy">This block's slice</h4>
      <p className="mt-0.5 text-micro leading-relaxed text-muted">
        Anything left on <span className="text-ink">Same as page</span> follows the filters at the
        top. Anything set here replaces them, for this block only.
      </p>

      <div className="mt-3 space-y-2">
        <Field label="Period">
          <select
            value={draft.period ?? INHERIT}
            onChange={(event) => set('period', event.target.value)}
            className="w-full rounded-chip border border-line bg-surface px-1.5 py-1 text-micro text-ink"
          >
            <option value={INHERIT}>Same as page</option>
            {/*
              * `custom` is left out on purpose: a per-block override stores a period, and a
              * custom range needs two dates alongside it. The page's own range is inherited
              * like any other dimension, so nothing here is unreachable — a block simply
              * cannot pin a *different* custom range than the page it sits on.
              */}
            {PERIODS.filter((period) => period !== 'custom').map((period) => (
              <option key={period} value={period}>
                {PERIOD_LABEL[period]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Branch"
          {...(exempt.branch ? { note: 'This block compares branches, so it ignores a branch filter.' } : {})}
        >
          <select
            value={draft.branch ?? INHERIT}
            disabled={exempt.branch}
            onChange={(event) => set('branch', event.target.value)}
            className="w-full rounded-chip border border-line bg-surface px-1.5 py-1 text-micro text-ink disabled:text-muted"
          >
            <option value={INHERIT}>Same as page</option>
            <option value="all">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Division"
          {...(exempt.division ? { note: 'This block compares divisions, so it ignores a division filter.' } : {})}
        >
          <select
            value={draft.division ?? INHERIT}
            disabled={exempt.division}
            onChange={(event) => set('division', event.target.value)}
            className="w-full rounded-chip border border-line bg-surface px-1.5 py-1 text-micro text-ink disabled:text-muted"
          >
            <option value={INHERIT}>Same as page</option>
            <option value="all">All divisions</option>
            {(['retail', 'corporate', 'treasury'] as const).map((division) => (
              <option key={division} value={division}>
                {DIVISIONS_LABEL[division]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Currency">
          <select
            value={draft.currency ?? INHERIT}
            onChange={(event) => set('currency', event.target.value)}
            className="w-full rounded-chip border border-line bg-surface px-1.5 py-1 text-micro text-ink"
          >
            <option value={INHERIT}>Same as page</option>
            <option value="all">All currencies</option>
            <option value="IQD">IQD</option>
            <option value="USD">USD</option>
            <option value="OTHER">Other currencies</option>
          </select>
        </Field>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="text-micro text-muted hover:text-ink">
          Back
        </button>
        <div className="flex items-center gap-2">
          {Object.keys(draft).length > 0 && (
            <button
              type="button"
              onClick={() => setDraft({})}
              className="text-micro font-bold text-accent hover:underline"
            >
              Follow the page
            </button>
          )}
          <button
            type="button"
            disabled={!dirty}
            // An empty draft applies as `undefined`, which deletes the key rather than
            // storing `{}` — the model treats those differently and so does the chip.
            onClick={() => onApply(Object.keys(draft).length > 0 ? draft : undefined)}
            className="rounded-chip bg-navy px-2.5 py-1 text-micro font-bold text-surface hover:bg-accent disabled:bg-line disabled:text-muted"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-label text-muted">{label}</span>
      <span className="mt-0.5 block">{children}</span>
      {note && <span className="mt-0.5 block text-micro leading-snug text-muted">{note}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------

function TitlePanel({
  block,
  insight,
  onApply,
  onBack,
}: {
  block: ReportBlock;
  insight: Insight;
  onApply: (title?: string) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(block.title ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.select(), []);

  // Empty clears the override and restores the insight's own title.
  const apply = (): void => onApply(draft.trim().length > 0 ? draft.trim() : undefined);

  return (
    <div className="absolute end-0 top-7 z-30 w-72 rounded-card border border-line bg-surface p-3 shadow-lg">
      <h4 className="text-h2 text-navy">Your title for this block</h4>
      <p className="mt-0.5 text-micro leading-relaxed text-muted">
        The insight keeps its own name underneath, so a reader can still tell what it is.
      </p>
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') apply();
        }}
        placeholder={insight.title}
        aria-label="Your title for this block"
        className="mt-2 w-full rounded-chip border border-line bg-surface px-1.5 py-1 text-micro text-ink"
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="text-micro text-muted hover:text-ink">
          Back
        </button>
        <div className="flex items-center gap-2">
          {block.title !== undefined && (
            <button
              type="button"
              onClick={() => onApply(undefined)}
              className="text-micro font-bold text-accent hover:underline"
            >
              Use the insight's title
            </button>
          )}
          <button
            type="button"
            onClick={apply}
            className="rounded-chip bg-navy px-2.5 py-1 text-micro font-bold text-surface hover:bg-accent"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
