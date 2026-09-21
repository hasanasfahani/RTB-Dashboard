import { useParams } from 'react-router-dom';
import { PageBody } from '../components/layout/AppShell.tsx';
import { SectionTabs } from '../components/layout/SectionTabs.tsx';
import { InsightCard } from '../components/insight/InsightCard.tsx';
import { toRows } from '../components/insight/layout.ts';
import { LAYERS, type Layer } from '../types.ts';
import { byLayer, bySection, sectionsFor } from '../data/insights.ts';
import { ASOF } from '../data/bank.ts';
import { describeFilters } from '../data/filters.ts';
import { useFilters } from '../state/FiltersContext.tsx';
import { formatDateLong } from '../design/format.ts';

const LAYER_COPY: Record<Layer, { title: string; blurb: string }> = {
  executive: {
    title: 'Executive 360°',
    blurb: 'The state of the bank on one screen, and the route from there to what explains it.',
  },
  'bank-wide': {
    title: 'Bank-Wide',
    blurb:
      'Group performance, balance sheet structure, treasury and ALM, liquidity and funding, capital, credit risk, operations, franchise and compliance.',
  },
  retail: {
    title: 'Retail Banking',
    blurb:
      'The retail franchise end to end — customer growth, deposits, lending, payments and cards, channels, collections and profitability.',
  },
  corporate: {
    title: 'Corporate Banking',
    blurb:
      'Client relationships, lending, deposits, trade finance, cash management, risk and returns across the corporate book.',
  },
};

function isLayer(value: string | undefined): value is Layer {
  return value !== undefined && (LAYERS as readonly string[]).includes(value);
}

/**
 * Serves Bank-Wide, Retail and Corporate from one component (PRD §11.2). Executive has
 * its own page only because of the headline band and attention strip above the tabs.
 *
 * ## Why every card is rendered, always
 *
 * A5 (plan §4): switching tabs must not remount charts, so tab switching is instant
 * during a demo. Every insight on the layer is therefore mounted once and tabs toggle
 * visibility — no card is added or removed by a tab change, and `key` stays stable.
 * Filtering the array instead would unmount and rebuild every Recharts tree on each
 * click, which is exactly the stutter the PRD is guarding against.
 */
export function InsightPage({ layer: fixedLayer }: { layer?: Layer } = {}) {
  const params = useParams<{ layer?: string; section?: string }>();
  const { filters } = useFilters();
  const layer = fixedLayer ?? (isLayer(params.layer) ? params.layer : 'bank-wide');

  const sections = sectionsFor(layer);
  const insights = byLayer(layer);
  const copy = LAYER_COPY[layer];

  // An unknown section slug falls back to All rather than showing an empty page.
  const requested = params.section;
  const activeSlug = sections.some((section) => section.slug === requested) ? requested : undefined;

  return (
    <>
      <SectionTabs layer={layer} sections={sections} total={insights.length} activeSlug={activeSlug} />
      <PageBody>
        <header className="mb-6">
          <h2 className="text-h1 text-navy">{copy.title}</h2>
          <p className="mt-1 max-w-4xl text-body text-muted">{copy.blurb}</p>
          <p className="mt-2 text-micro text-muted">
            {insights.length} insights · {sections.length} sections · Data as of{' '}
            {formatDateLong(ASOF)} · {describeFilters(filters)}
          </p>
        </header>

        {sections.map((section) => {
          const visible = activeSlug === undefined || activeSlug === section.slug;
          return (
            <section
              key={section.slug}
              id={`section-${section.slug}`}
              // `hidden` rather than conditional rendering — see the note above.
              hidden={!visible}
              className={visible ? 'mb-8' : ''}
            >
              <h3 className="mb-4 flex items-baseline gap-3 border-b-2 border-navy pb-1.5">
                <span className="text-h1 text-navy">{section.label}</span>
                <span className="text-micro text-muted">
                  {section.count} {section.count === 1 ? 'insight' : 'insights'}
                </span>
              </h3>
              <div className="space-y-10">
                {toRows(bySection(layer, section.slug)).map((row) => (
                  <div
                    key={row[0]?.id}
                    className={`grid gap-x-8 gap-y-10 ${row.length === 2 ? 'xl:grid-cols-2' : ''}`}
                  >
                    {row.map((insight) => (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        filters={filters}
                        lead={insight.demoPath}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </PageBody>
    </>
  );
}
