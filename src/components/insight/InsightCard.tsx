import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Filters, Insight } from '../../types.ts';
import { DEFAULT_FILTERS } from '../../data/filters.ts';
import { seriesFor } from '../../data/seriesFor.ts';
import { findingFor } from '../../data/finding.ts';
import { IdChip } from '../ui/Badge.tsx';
import { GenerateInsightsButton } from './GenerateInsightsButton.tsx';
import { InsightDisclosures, InsightPanels } from './InsightBody.tsx';
import { Emphasis } from '../ui/Emphasis.tsx';
import { cardSpan } from './layout.ts';
import { useReveal } from '../../design/useReveal.ts';

/**
 * The atomic unit (PRD §11.4).
 *
 * Two-panel insights use one of **two** layouts, not the flat 50/50 the PRD describes.
 * `KpiCards` is the second panel in 23 of the 73 two-panel insights (plan §2.7) — a KPI
 * sidecar rather than a co-equal chart — so those get roughly 65/35 and everything else
 * splits evenly with a hairline divider.
 *
 * ## The finding line
 *
 * The line directly under the title states what the numbers are *doing*, computed from
 * the rendered data (`finding.ts`). The catalogue's own `whatItTells` is a definition
 * and sits below the chart as context. A reader should be able to take the finding and
 * leave without studying the chart.
 */
export const InsightCard = memo(function InsightCard({
  insight,
  filters = DEFAULT_FILTERS,
  height = 240,
  linkToDetail = true,
  lead = false,
}: {
  insight: Insight;
  filters?: Filters;
  height?: number;
  linkToDetail?: boolean;
  /** Rendered at greater width and height — reserved for the insights that carry the story. */
  lead?: boolean;
}) {
  // The finding comes from the first panel, which is always the primary chart.
  const finding = useMemo(
    () => findingFor(seriesFor(insight.id, 0, filters)),
    [insight.id, filters],
  );

  // Reveals once as it scrolls into frame. Applied to the card rather than the chart, so
  // all 23 component types behave identically — see `useReveal`.
  const [revealRef, revealClass] = useReveal<HTMLElement>();

  // The page has already chunked rows using the same decision, so this only styles.
  const spanTwo = lead && cardSpan(insight) === 2;
  const chartHeight = spanTwo ? height + 60 : height;

  const title = <h3 className={`${lead ? 'text-h1' : 'text-h2'} text-navy group-hover:text-accent`}>{insight.title}</h3>;

  return (
    <article
      id={insight.id}
      ref={revealRef}
      /*
       * `scroll-mt` so the card clears the sticky header when something scrolls it into
       * view — the insights panel does, and so does a `#E-02` deep link, which used to
       * land with the title tucked under the bar.
       */
      className={`group flex scroll-mt-[calc(var(--header-h,42px)+12px)] flex-col bg-surface ${revealClass}`}
      // Cards must not break across pages when printed (PRD §12).
      style={{ breakInside: 'avoid' }}
    >
      {/* A hairline above rather than a box around: one rule instead of four. */}
      <header className={`border-t-2 ${lead ? 'border-t-navy' : 'border-t-line'} px-4 pb-3 pt-3`}>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IdChip id={insight.id} />
            {insight.demoPath && (
              <span className="text-micro text-accent" title="On the CEO narrative path">
                ●
              </span>
            )}
          </div>
          <span className="shrink-0 text-micro text-muted">{insight.refresh}</span>
        </div>

        {linkToDetail ? (
          <Link to={`/insight/${insight.id}`} className="block">
            {title}
          </Link>
        ) : (
          title
        )}

        {finding && (
          <p className={`mt-1.5 max-w-3xl ${lead ? 'text-h2 font-normal' : 'text-body'} leading-snug text-ink`}>
            <Emphasis text={finding} />
          </p>
        )}
      </header>

      <div className="flex-1 px-4 pb-3">
        <InsightPanels insight={insight} filters={filters} height={chartHeight} />
        {/* The call to action sits at the bottom-right of the chart it reads, not in the
            header — a reader decides they want the reading after looking at the marks. */}
        <div className="mt-3 flex justify-end">
          <GenerateInsightsButton insight={insight} />
        </div>
      </div>

      <footer className="px-4 pb-4">
        <InsightDisclosures insight={insight} />
      </footer>
    </article>
  );
});
