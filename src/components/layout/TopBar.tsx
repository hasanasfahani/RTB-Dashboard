import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo-rtb.svg';
import { MainNav } from './MainNav.tsx';
import { FilterBar } from './FilterBar.tsx';
import { ReportRail } from '../reports/ReportRail.tsx';
import { FilterSummary } from './FilterSummary.tsx';

/**
 * The top bar: the mark, the navigation, the reader's reports and the global filters.
 *
 * ## Sticky, and on one row
 *
 * It used to stack the brand over the nav over the filters — about 160px of chrome, none of
 * it pinned, so scrolling a section of 54 cards left the reader with no way to change layer
 * or filter without going back to the top. Brand and nav now share a row and the whole bar
 * is sticky, which roughly halves the height *and* keeps the filters reachable, which is the
 * more useful half of the change: they apply to every chart on screen.
 *
 * ## Why not a sidebar
 *
 * It was the obvious alternative and it is the wrong one here. The pages are two-column grids
 * of charts capped at 1440px, so a 220px rail spends ~17% of the width on every screen for
 * good, to recover vertical space that collapsing two rows recovers once and for nothing. It
 * would also split one hierarchy across two axes — layer down the side, section along the top
 * — and it would walk away from rtb.iq, which navigates horizontally, after five phases spent
 * matching it.
 *
 * ## Condensing on scroll
 *
 * Past the top, the filter row folds into a one-line summary on the nav row — 78px becomes
 * 41px, and the sticky chrome goes from 119px to 82px.
 *
 * It is the filter row and not the mark because of what the measurements said. The mark shares
 * its line with the navigation, which is the taller of the two, so hiding it saves a single
 * pixel; and the nav and the filters cannot be merged onto one row, because at 1280 they need
 * about 1,250px together and at 1024 they do not fit at all. The filter row was the only thing
 * on the bar with 36px to give.
 *
 * Filters are read far more often than they are changed, so a sentence saying what is in force
 * is a fair trade for the row that sets it — and one click brings the row back.
 *
 * The as-of date used to sit at the end of this row. Removed at the owner's request, and not
 * lost: every page header still states `Data as of 31 August 2026` beside the filters actually
 * in force.
 */
export function TopBar({ condensed = false }: { condensed?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  /*
   * Set by clicking the summary, cleared on returning to the top.
   *
   * Without it the row would close again on the reader's next scroll tick, a moment after they
   * asked for it.
   */
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    if (!condensed) setPinned(false);
  }, [condensed]);

  const showControls = !condensed || pinned;

  /*
   * The bar's height, published as a CSS variable.
   *
   * The section tab bar sticks directly beneath it, and the height is not a constant: the
   * report rail appears once the reader has a report, and the filter bar grows a second row
   * when a custom range is open. A hardcoded offset would be wrong in exactly the states a
   * reader reaches by using the thing.
   */
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const publish = (): void => {
      document.documentElement.style.setProperty(
        '--header-h',
        `${Math.round(element.getBoundingClientRect().height)}px`,
      );
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    /* `data-chrome` marks it as something pinned to the top of the window, which the
       insights panel measures so it can start below it — see `useChromeBottom`. */
    <header ref={ref} data-chrome="header" className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="flex items-center gap-5 px-6">
        {/*
          * Inlined by Vite at 2.3KB, so the build still fetches nothing at runtime (PRD §4).
          * The mark already carries the brand navy and cyan, so it needs no recolouring.
          * It is the way back to the front page, as it is on rtb.iq.
          */}
        <Link to="/executive" aria-label="RTB — Executive 360°" className="shrink-0 py-2">
          <img src={logo} alt="RTB" width={88} height={25} />
        </Link>
        {/* The product name yields before the navigation does, rather than wrapping it. */}
        <h1 className="hidden shrink-0 border-s border-line ps-4 text-h2 text-navy xl:block">
          Business Intelligence
        </h1>
        <div className="min-w-0 flex-1">
          <MainNav />
        </div>
        {!showControls && <FilterSummary onOpen={() => setPinned(true)} />}
      </div>
      {/* Renders nothing until the reader has a report — see ReportRail. */}
      {!condensed && <ReportRail />}
      {/* Filters live in the top bar and apply everywhere (PRD §12). */}
      {showControls && <FilterBar />}
    </header>
  );
}
