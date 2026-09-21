import { Link, useParams } from 'react-router-dom';
import { PageBody } from '../components/layout/AppShell.tsx';
import { InsightPanel } from '../components/charts/registry.tsx';
import { IdChip } from '../components/ui/Badge.tsx';
import { GenerateInsightsButton } from '../components/insight/GenerateInsightsButton.tsx';
import { prevNextInSection, sectionOf, tryById } from '../data/insights.ts';
import { useFilters } from '../state/FiltersContext.tsx';
import { ASOF } from '../data/bank.ts';
import { formatDateLong } from '../design/format.ts';

/**
 * `/insight/:id` (PRD §11.5) — full-width chart at ~420px, the full method, and
 * previous/next **within the section**.
 *
 * Both breadcrumb crumbs link back: the layer to its page, the section to that page
 * with the tab active.
 */
export function InsightDetail() {
  const { id } = useParams<{ id: string }>();
  const { filters } = useFilters();
  const insight = id ? tryById(id) : undefined;

  if (!insight) {
    return (
      <PageBody>
        <h2 className="text-h1 text-navy">Insight not found</h2>
        <p className="mt-2 text-body text-muted">
          No insight with id “{id}” exists in the catalogue.
        </p>
        <Link to="/executive" className="mt-4 inline-block text-h2 text-accent hover:underline">
          Back to Executive 360° →
        </Link>
      </PageBody>
    );
  }

  const section = sectionOf(insight);
  const { prev, next } = prevNextInSection(insight.id);
  const panels = insight.panels;

  return (
    <PageBody>
      <nav aria-label="Breadcrumb" className="mb-4 text-micro text-muted">
        <Link to={`/${insight.layer}`} className="text-accent hover:underline">
          {insight.layerLabel}
        </Link>
        <span className="mx-1.5">›</span>
        {/* Both crumbs link back to the page with that tab active (PRD §11.5). */}
        <Link to={`/${insight.layer}/${section.slug}`} className="text-accent hover:underline">
          {section.label}
        </Link>
        <span className="mx-1.5">›</span>
        <span className="font-bold text-ink">{insight.id}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <IdChip id={insight.id} />
            <span className="text-micro text-muted">{insight.vizLabel}</span>
          </div>
          <h2 className="text-h1 text-navy">{insight.title}</h2>
          <p className="mt-1 max-w-3xl text-body text-ink">{insight.whatItTells}</p>
        </div>
        <dl className="shrink-0 text-end text-micro text-muted">
          <dt className="text-label">Refresh</dt>
          <dd className="mb-1 text-ink">{insight.refresh}</dd>
          <dt className="text-label">Data as of</dt>
          <dd className="text-ink">{formatDateLong(ASOF)}</dd>
        </dl>
      </header>

      <div className={`grid gap-6 ${panels.length === 2 ? 'xl:grid-cols-2' : ''}`}>
        {panels.map((panel, panelIndex) => (
          <section
            key={`${panel.component}-${panelIndex}`}
            className="rounded-card border border-line bg-surface p-5"
          >
            <p className="mb-3 text-label text-muted">
              {panel.component}
              {panel.variant !== 'plain' && <span className="ms-1 font-normal">· {panel.variant}</span>}
            </p>
            <InsightPanel
              id={insight.id}
              panelIndex={panelIndex}
              filters={filters}
              height={panels.length === 2 ? 320 : 420}
            />
          </section>
        ))}
      </div>

      {/* Below the charts, right-aligned — the same position it holds on a card. */}
      <div className="mt-4 flex justify-end">
        <GenerateInsightsButton insight={insight} />
      </div>

      <section className="mt-6 rounded-card border border-line bg-surface p-5">
        <h3 className="text-label text-muted">How this is calculated</h3>
        <p className="mt-2 max-w-4xl text-body leading-relaxed text-ink">{insight.method}</p>
      </section>

      <nav className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-4">
        {prev ? (
          <Link to={`/insight/${prev.id}`} className="max-w-[45%] text-start">
            <span className="block text-micro text-muted">← Previous in {section.label}</span>
            <span className="block text-h2 text-accent hover:underline">{prev.title}</span>
          </Link>
        ) : (
          <span className="text-micro text-muted">First in {section.label}</span>
        )}
        {next ? (
          <Link to={`/insight/${next.id}`} className="max-w-[45%] text-end">
            <span className="block text-micro text-muted">Next in {section.label} →</span>
            <span className="block text-h2 text-accent hover:underline">{next.title}</span>
          </Link>
        ) : (
          <span className="text-micro text-muted">Last in {section.label}</span>
        )}
      </nav>
    </PageBody>
  );
}
