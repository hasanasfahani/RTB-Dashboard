import { Link, useParams } from 'react-router-dom';
import { PageBody } from '../components/layout/AppShell.tsx';
import { SectionTabs } from '../components/layout/SectionTabs.tsx';
import { InsightCard } from '../components/insight/InsightCard.tsx';
import { toRows } from '../components/insight/layout.ts';
import { Sparkline } from '../components/charts/KpiCards.tsx';
import { Delta } from '../components/ui/Delta.tsx';
import { byLayer, sectionsFor, bySection } from '../data/insights.ts';
import { ASOF, bank } from '../data/bank.ts';
import { describeFilters } from '../data/filters.ts';
import { useArrival } from '../design/motion.ts';
import { buildCallouts, type Callout } from '../data/attention.ts';
import { useFilters } from '../state/FiltersContext.tsx';
import { seeded, trend } from '../data/generators.ts';
import { tokens } from '../design/tokens.ts';
import { formatDateLong, formatPercent, formatValue } from '../design/format.ts';
import type { Filters, Unit } from '../types.ts';

/**
 * Executive 360° (PRD §11.3).
 *
 * Same shell as the other three layers, with two additions above where the tab bar
 * will go: the headline band and the attention strip. This is the screen the CEO sees
 * first and judges the product by.
 *
 * The section tab bar is Phase 5; this renders the `All` view, which is the tab the
 * demo uses anyway because several Executive sections hold a single insight.
 */
export function Executive() {
  const params = useParams<{ section?: string }>();
  const { filters } = useFilters();
  const insights = byLayer('executive');
  const sections = sectionsFor('executive');
  const activeSlug = sections.some((section) => section.slug === params.section)
    ? params.section
    : undefined;

  return (
    <>
      <HeadlineBand />
      <AttentionStrip filters={filters} />
      {/*
        * The tab bar sits below the two additions, matching the other three layers.
        * Several Executive sections hold a single insight, so `All` is the tab the demo
        * uses; the section tabs exist for structural fidelity with the workbook (PRD §11.3).
        */}
      <SectionTabs
        layer="executive"
        sections={sections}
        total={insights.length}
        activeSlug={activeSlug}
      />
      <PageBody>
        <header className="mb-6">
          <h2 className="text-h1 text-navy">Executive 360°</h2>
          <p className="mt-1 text-body text-muted">
            The state of the bank on one screen, and the route from there to what explains it.
          </p>
          <p className="mt-2 text-micro text-muted">
            {insights.length} insights · {sections.length} sections · Data as of{' '}
            {formatDateLong(ASOF)} · {describeFilters(filters)}
          </p>
        </header>

        {/* Kept mounted, visibility toggled — A5, same as `InsightPage`. */}
        {sections.map((section) => {
          const visible = activeSlug === undefined || activeSlug === section.slug;
          return (
            <section
              key={section.slug}
              id={`section-${section.slug}`}
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
                {toRows(bySection('executive', section.slug)).map((row) => (
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

// ---------------------------------------------------------------------------
// Headline band — PRD §11.3
// ---------------------------------------------------------------------------

interface Headline {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly unit: Unit;
  readonly deltaPct: number;
  readonly downIsGood: boolean;
  readonly spark: readonly number[];
}

/** A 12-month tail for a headline tile, seeded so it never reshuffles. */
function headlineSpark(key: string, endValue: number, growth: number): number[] {
  return trend({ points: 12, endValue, growth, jitter: 0.012, rng: seeded(`headline:${key}`) });
}

/**
 * Four large tiles: total assets, customer deposits, net profit MTD, CAR — each with a
 * MoM delta and a 12-month sparkline, on full-bleed navy.
 *
 * Values come from the `bank` fixture, so the band agrees with every card below it.
 */
function HeadlineBand() {
  const headlines: readonly Headline[] = [
    {
      key: 'assets',
      label: 'Total assets',
      value: bank.balanceSheet.totalAssets,
      unit: 'iqd',
      deltaPct: 1.2,
      downIsGood: false,
      spark: headlineSpark('assets', bank.balanceSheet.totalAssets, 0.012),
    },
    {
      key: 'deposits',
      label: 'Customer deposits',
      value: bank.balanceSheet.customerDeposits,
      unit: 'iqd',
      deltaPct: 1.1,
      downIsGood: false,
      spark: headlineSpark('deposits', bank.balanceSheet.customerDeposits, 0.011),
    },
    {
      key: 'profit',
      label: 'Net profit MTD',
      value: bank.income.netProfit,
      unit: 'iqd',
      deltaPct: 2.4,
      downIsGood: false,
      spark: headlineSpark('profit', bank.income.netProfit, 0.01),
    },
    {
      key: 'car',
      label: 'Capital adequacy',
      value: bank.ratios.car,
      unit: 'percent',
      deltaPct: 0.3,
      downIsGood: false,
      spark: headlineSpark('car', bank.ratios.car, 0.001),
    },
  ];

  const [hero, ...rest] = headlines;
  /*
   * Once per session, and only here. This is the screen with an arrival worth marking —
   * demo beat 1, "this is the bank on one screen" — and it is eight cards rather than
   * Retail's 54, so nothing is competing for the frame. Navigating away and back does
   * not replay it; a reload does, which is the right behaviour before walking in.
   */
  const arriving = useArrival();

  return (
    <div className="bg-navy">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-7">
        {/*
          * The position stated in a sentence, before any tile. A dashboard that opens
          * with four equal numbers has not said anything; one that opens with a claim has.
          */}
        <p
          className={`max-w-4xl text-h2 font-normal leading-snug text-series-4 ${
            arriving ? 'arrive' : ''
          }`}
        >
          RTB holds{' '}
          <span className="font-bold text-surface">
            {formatValue(bank.balanceSheet.totalAssets, 'iqd', { compact: true })} IQD
          </span>{' '}
          in assets against{' '}
          <span className="font-bold text-surface">
            {formatValue(bank.balanceSheet.customerDeposits, 'iqd', { compact: true })} IQD
          </span>{' '}
          of customer deposits, lending{' '}
          <span className="font-bold text-surface">{formatPercent(bank.ratios.ldr)}</span> of what it
          takes in, with capital at{' '}
          <span className="font-bold text-surface">{formatPercent(bank.ratios.car)}</span> against a
          12.5% regulatory floor.
        </p>

        <div className="mt-6 grid items-end gap-6 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* One number is singular, three are supporting. */}
          {hero && (
            <div className={arriving ? 'arrive-delayed' : ''}>
              <p className="text-label text-series-4">{hero.label}</p>
              <p className="mt-0.5 text-[56px] font-bold leading-none text-surface">
                {formatValue(hero.value, hero.unit, { compact: true })}
                <span className="ms-2 text-h1 font-normal text-series-4">IQD</span>
              </p>
              <div className="mt-2 flex items-center gap-3">
                <Delta value={hero.deltaPct} downIsGood={hero.downIsGood} onDark />
                <span className="text-micro text-series-4">month on month</span>
                <Sparkline values={hero.spark} width={96} height={24} colour={tokens.series[3]} />
              </div>
            </div>
          )}
          {rest.map((headline) => (
            <div key={headline.key} className="border-s border-series-3 ps-5">
              <p className="text-label text-series-4">{headline.label}</p>
              <p className="mt-0.5 text-kpi leading-none text-surface">
                {formatValue(headline.value, headline.unit, { compact: true })}
                {headline.unit === 'iqd' && <span className="ms-1 text-h2 text-series-4">IQD</span>}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <Delta value={headline.deltaPct} downIsGood={headline.downIsGood} onDark />
                <Sparkline values={headline.spark} width={60} height={18} colour={tokens.series[3]} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attention strip — PRD §11.3
// ---------------------------------------------------------------------------

const TONE_DOT: Record<Callout['tone'], string> = {
  warning: 'bg-warning',
  negative: 'bg-negative',
  positive: 'bg-positive',
};

function AttentionStrip({ filters }: { filters: Filters }) {
  // Recomputed under the active filters, so the strip cannot contradict the charts it
  // links to when a branch or division is selected.
  const callouts = buildCallouts(filters);
  const [lead, ...rest] = callouts;

  /*
   * An editorial lede, not four validation pills. The first item is the one the reader
   * should act on, so it is set larger and given the room; the rest follow as a ranked
   * list. Ink on paper — the pale amber wash this replaced read as a form error.
   */
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-5">
        <p className="mb-3 text-label text-muted">What needs attention</p>
        <div className="grid gap-x-10 gap-y-3 lg:grid-cols-[1.3fr_1fr]">
          {lead && (
            <Link to={`/insight/${lead.id}`} className="group flex items-start gap-3">
              <span className={`mt-2.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[lead.tone]}`} />
              <span className="min-w-0">
                <span className="block text-h1 font-normal leading-snug text-ink group-hover:text-accent">
                  {lead.text}
                </span>
                {/* On its own line: inline, it wrapped into the middle of the sentence. */}
                <span className="mt-1 block text-micro font-bold text-accent">
                  {lead.id} — read the detail →
                </span>
              </span>
            </Link>
          )}
          <ul className="space-y-2 border-s border-line ps-6">
            {rest.map((callout) => (
              <li key={callout.id}>
                <Link to={`/insight/${callout.id}`} className="group flex items-start gap-2.5">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[callout.tone]}`} />
                  <span className="text-body leading-snug text-ink group-hover:text-accent">
                    {callout.text}
                  </span>
                  <span className="ms-auto whitespace-nowrap ps-2 text-micro font-bold text-accent">
                    {callout.id} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

