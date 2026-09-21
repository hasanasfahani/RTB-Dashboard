import type { ReactNode } from 'react';
import type { Filters, Insight } from '../../types.ts';
import { UNIVERSAL, guideFor } from '../../data/chartGuide.ts';
import { InsightPanel } from '../charts/registry.tsx';

/**
 * The parts of a card below its header, shared by the section pages and by reports.
 *
 * Split out in Phase C rather than copied. A report block is the same insight rendered
 * under a different view, and the sidecar rule, the disclosures and the universal caveat
 * have to stay identical in both places — a second copy would drift, and the one that
 * drifts is always the one fewer people look at.
 *
 * The headers are deliberately *not* shared: a section card shows an id chip and links to
 * the detail page, a report card shows scope chips and a remove control.
 */

/** Either one panel, or the 65/35 sidecar split, or two co-equal panels (PRD §11.4). */
export function InsightPanels({
  insight,
  filters,
  height,
}: {
  insight: Insight;
  filters: Filters;
  height: number;
}) {
  const panels = insight.panels;
  const isSidecar = panels.length === 2 && panels[1]?.component === 'KpiCards';

  if (panels.length === 1) {
    return <InsightPanel id={insight.id} panelIndex={0} filters={filters} height={height} />;
  }

  /*
   * `min-w-0` on both columns.
   *
   * A grid item defaults to `min-width: auto`, so it refuses to shrink below the *min-content*
   * width of what it holds — and a KPI panel whose tiles are laid out with
   * `repeat(auto-fit, minmax(8.5rem, 1fr))` reports a min-content width of four full tracks.
   * That dragged the 1fr sidecar from 419px to 604px and pushed the card past the viewport,
   * which is the same trap `WaterfallChart` and `DonutChart` hit at 1280px in Phase 7.
   */
  return (
    <div className={`grid gap-4 ${isSidecar ? 'lg:grid-cols-[1.9fr_1fr]' : 'lg:grid-cols-2'}`}>
      <div className="min-w-0">
        <InsightPanel id={insight.id} panelIndex={0} filters={filters} height={height} />
      </div>
      {/* Hairline divider between co-equal panels (PRD §11.4). */}
      <div className={`min-w-0 ${isSidecar ? '' : 'lg:border-s lg:border-line lg:ps-4'}`}>
        <InsightPanel id={insight.id} panelIndex={1} filters={filters} height={height} />
      </div>
    </div>
  );
}

/**
 * `whatItTells`, then the two disclosures.
 *
 * `note` carries the I3 sentence that says part of the block's scope did not apply. On screen
 * it lives inside "How this is calculated", which is where a caveat about the figures belongs,
 * and the struck-through chip on the card face carries the signal.
 *
 * On **paper** it has to be promoted, because neither of those survives printing: a closed
 * `<details>` prints nothing but its summary, and the chip's tooltip does not exist at all. A
 * printed report would otherwise show a struck-through "Basra" with no explanation anywhere on
 * the page — and that is precisely the document most likely to be read by someone who was not
 * in the room. Hence the second copy, shown only in print.
 */
export function InsightDisclosures({ insight, note }: { insight: Insight; note?: string }) {
  const primary = insight.panels[0];
  const guide = guideFor(primary.component, primary.variant);

  return (
    <>
      {note && (
        <p className="mb-2 hidden text-micro leading-relaxed text-ink print:block">{note}</p>
      )}
      <p className="mb-2 text-micro leading-relaxed text-muted">{insight.whatItTells}</p>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <Disclosure label="Info — how to read this">
          <p className="text-micro leading-relaxed text-ink">{guide.reading}</p>
          <p className="mt-1.5 text-micro leading-relaxed text-muted">
            <span className="font-bold text-ink">What to look for. </span>
            {guide.lookFor}
          </p>
          <p className="mt-1.5 text-micro leading-relaxed text-muted">{UNIVERSAL}</p>
        </Disclosure>
        <Disclosure label="How this is calculated">
          <p className="text-micro leading-relaxed text-muted">{insight.method}</p>
          {note && <p className="mt-1.5 text-micro leading-relaxed text-ink">{note}</p>}
          <p className="mt-1.5 text-micro text-muted">
            {insight.vizLabel} · {insight.domain} · {insight.refresh}
          </p>
        </Disclosure>
      </div>
    </>
  );
}

export function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="min-w-0 basis-full">
      <summary className="cursor-pointer select-none text-micro font-bold text-accent hover:underline">
        {label}
      </summary>
      <div className="mt-2 max-w-3xl border-s-2 border-line ps-3">{children}</div>
    </details>
  );
}
