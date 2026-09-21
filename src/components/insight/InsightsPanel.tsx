import { useEffect, useRef, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { STAGES } from '../../data/insightProvider.ts';
import type { Action, GeneratedInsight, Verdict } from '../../data/generatedInsight.ts';
import { prefersReducedMotion } from '../../design/motion.ts';
import { useChromeBottom } from '../../design/useChromeBottom.ts';
import { useInsightsControls, useInsightsRun } from '../../state/InsightsPanelContext.tsx';
import { Badge } from '../ui/Badge.tsx';
import { IdChip } from '../ui/Badge.tsx';

/**
 * The reading, beside the chart rather than on top of it.
 *
 * ## It never covers the card it describes
 *
 * An insight that hides the evidence it is describing is worth less than the chart alone,
 * and a reader wants to hover a series while reading the finding that names it. So this is
 * deliberately **not** the `BlockPicker` pattern: no `inset-0` backdrop, no dimming, and
 * nothing that swallows pointer events over the page. The page content is given an
 * inline-end padding instead (`PageBody`), so the grid narrows rather than being covered.
 *
 * ## It starts below **all** of the sticky chrome, measured
 *
 * The first version anchored to `--header-h`, which describes the top bar alone. On the
 * layer pages there is also a section tab bar sticky beneath it, and at the top of the page
 * the banner is still pushing both of them down — so the panel's own header, and the close
 * button in it, ended up underneath the tabs, and the panel covered the right-hand end of a
 * tab row that scrolls horizontally. `useChromeBottom` measures the lowest edge of anything
 * carrying `data-chrome` instead, live, and the panel drops to `z-10` so the bars paint over
 * it rather than the other way round during a change.
 *
 * Starting below the chrome is not cosmetic: the filters live in that bar, and the whole
 * point of a non-modal panel is that a reader can change the selection while it is open.
 *
 * Below 1280px there is no room beside a chart, so it docks to the bottom half and the card
 * is scrolled into the half above it.
 *
 * ## Not focus-trapped
 *
 * Because it is not modal. Escape closes it, focus returns to the button that opened it,
 * and everything behind it stays reachable by tab in visual order.
 */
export function InsightsPanel() {
  const { target, run, loading, progress, stage } = useInsightsRun();
  const { close } = useInsightsControls();
  const bodyRef = useRef<HTMLDivElement>(null);
  /* The route, because the tab bar exists on the layer pages and not on the others, and
     the panel stays open across a navigation between the two. */
  const { pathname } = useLocation();
  const chromeBottom = useChromeBottom(pathname);
  const id = target?.insight.id;

  // Escape, and only Escape: the chart's own state is none of this panel's business.
  useEffect(() => {
    if (!target) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, close]);

  /*
   * Bring the card into the free column.
   *
   * The grid narrows when the panel opens, so a card can end up above or below the fold
   * even though nothing is covering it. `nearest` on a wide screen moves the page only if
   * it has to; below 1280px the panel takes the lower half, so the card is put at the top.
   */
  useEffect(() => {
    if (!id) return;
    const card = document.getElementById(id);
    if (!card) return;
    const docked = window.innerWidth < 1280;
    card.scrollIntoView({
      block: docked ? 'start' : 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [id]);

  /* A regeneration starts at the top of the new reading, not halfway down the old one. */
  useEffect(() => {
    if (loading) bodyRef.current?.scrollTo({ top: 0 });
  }, [loading]);

  if (!target) return null;

  return (
    <aside
      aria-label={`Insights for ${target.insight.title}`}
      /*
       * `role="complementary"`, never `dialog`: a dialog is modal by contract, and assistive
       * technology would announce this as one — which would be a promise the panel breaks
       * the moment a reader tabs back to the chart. The print stylesheet hides it by class,
       * not by role, for the same reason.
       */
      /*
       * `--chrome-b` rather than an inline `top`: the value only applies from 1280px, where
       * the panel is a side rail. Below that it docks to the bottom and the chrome is
       * irrelevant to it, and a plain inline style cannot be made conditional on a media
       * query.
       */
      style={{ '--chrome-b': `${chromeBottom}px` } as CSSProperties}
      className="insights-panel fixed inset-x-0 bottom-0 z-10 flex h-[50vh] flex-col border-t border-line bg-surface shadow-lg xl:inset-x-auto xl:end-0 xl:top-[var(--chrome-b,0px)] xl:h-auto xl:w-96 xl:border-s xl:border-t-0"
    >
      <header className="border-b border-line px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <IdChip id={target.insight.id} />
            <span className="text-label text-muted">Insights</span>
          </div>
          {/*
            * Always visible, because the panel header never scrolls — it sits outside the
            * scrolling body. It was there before and could not be seen: the header was
            * behind the tab bar. Bordered rather than bare so it reads as a control at a
            * glance, which is what a reader looks for first in something that just appeared.
            */}
          <button
            type="button"
            onClick={close}
            aria-label="Close insights"
            title="Close — the chart is unaffected (Esc)"
            className="shrink-0 rounded-chip border border-line p-1 text-muted hover:bg-canvas hover:text-ink"
          >
            <X size={14} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
        <h2 className="text-h2 text-navy">{target.insight.title}</h2>
        {/*
          * The scope, on the face of the panel.
          *
          * The reader can change the filters while this is open, so this is their proof
          * that the words below belong to the chart beside them — the same job the I3
          * chips do on a report block.
          */}
        <p className="mt-1 text-micro text-muted">{run?.insight.scope ?? 'Reading the selection…'}</p>
      </header>

      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading || !run ? <Loading progress={progress} stage={stage} /> : <Reading result={run.insight} note={run.note} />}
      </div>
    </aside>
  );
}

/**
 * A determinate bar, not a spinner.
 *
 * The stages are the work in order, so the wait reads as work rather than as latency —
 * and because the bar is determinate, a reader can tell the difference between slow and
 * stuck. It holds at 90% under a live provider until the response lands.
 */
function Loading({ progress, stage }: { progress: number; stage: string }) {
  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label={stage}
        className="h-1 w-full overflow-hidden rounded-chip bg-canvas"
      >
        <div
          className="insights-bar h-full bg-accent"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-micro text-muted">{stage}…</p>

      {/* The shape of the answer, so the panel fills rather than jumps. */}
      <div className="mt-5 space-y-3" aria-hidden>
        {[10, 7, 8, 5].map((width, index) => (
          <div
            key={index}
            className="h-2 rounded-chip bg-canvas"
            style={{ width: `${width * 10}%` }}
          />
        ))}
      </div>
      <p className="sr-only">Generating insights: {STAGES.join(', then ')}.</p>
    </div>
  );
}

const VERDICT_TONE: Record<Verdict, 'positive' | 'warning' | 'negative' | 'neutral'> = {
  positive: 'positive',
  watch: 'warning',
  negative: 'negative',
  neutral: 'neutral',
};

const VERDICT_LABEL: Record<Verdict, string> = {
  positive: 'On plan',
  watch: 'Watch',
  negative: 'Breach',
  neutral: 'Neutral',
};

/** The four beats, in order: what is happening, why it matters, what to do, what to watch. */
function Reading({ result, note }: { result: GeneratedInsight; note: string | undefined }) {
  return (
    <div>
      <div className="mb-2">
        <Badge tone={VERDICT_TONE[result.verdict]}>{VERDICT_LABEL[result.verdict]}</Badge>
      </div>
      <p className="text-h1 leading-snug text-navy">{result.headline}</p>

      <ul className="mt-4 space-y-3">
        {result.findings.map((finding) => (
          <li key={finding.text}>
            <p className="text-body leading-snug text-ink">{finding.text}</p>
            {/*
              * The figure, set apart from the claim.
              *
              * Splitting them is what stops a claim floating free of the data: the generator
              * cannot emit one without the other. Tabular numerals so a column of them lines
              * up, per the density work in §2.25.
              */}
            <p className="mt-0.5 text-micro font-bold tabular-nums text-accent">{finding.evidence}</p>
          </li>
        ))}
      </ul>

      <section className="mt-5 border-t border-line pt-3">
        <h3 className="text-label text-muted">So what</h3>
        <p className="mt-1 text-body leading-snug text-ink">{result.soWhat}</p>
      </section>

      <section className="mt-4 border-t border-line pt-3">
        <h3 className="text-label text-muted">Do</h3>
        <ul className="mt-1.5 space-y-2">
          {result.actions.map((action) => (
            <li key={action.text} className="flex gap-2">
              <HorizonChip horizon={action.horizon} />
              <span className="min-w-0 text-body leading-snug text-ink">
                {action.text}
                <span className="text-muted"> — {action.owner}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {result.watchNext && (
        <section className="mt-4 border-t border-line pt-3">
          <h3 className="text-label text-muted">Watch</h3>
          <p className="mt-1 text-body leading-snug text-ink">{result.watchNext}</p>
        </section>
      )}

      <footer className="mt-5 border-t border-line pt-3">
        <p className="text-micro text-muted">
          Confidence: {result.confidence}
          {result.caveat ? ` · ${result.caveat}` : ''}
        </p>
        {/* Where a live provider could not be reached, the panel says so rather than erroring. */}
        {note && <p className="mt-1 text-micro text-muted">{note}</p>}
        <p className="mt-1 text-micro text-muted">
          Generated from the figures this panel drew. Synthetic data.
        </p>
      </footer>
    </div>
  );
}

function HorizonChip({ horizon }: { horizon: Action['horizon'] }) {
  return (
    <span
      data-chip="horizon"
      className="mt-0.5 h-fit shrink-0 rounded-chip border border-line px-1.5 py-0.5 text-micro font-bold uppercase tracking-wider text-muted"
    >
      {horizon}
    </span>
  );
}
