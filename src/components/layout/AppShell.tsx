import { useEffect, useState, type ReactNode } from 'react';
import { DemoBanner } from './DemoBanner.tsx';
import { TopBar } from './TopBar.tsx';
import { CommandPalette } from '../CommandPalette.tsx';
import { InsightsPanel } from '../insight/InsightsPanel.tsx';
import { useInsightsControls } from '../../state/InsightsPanelContext.tsx';

/**
 * Banner, top bar, content, footer — on every route.
 *
 * Target is a boardroom screen and a laptop (PRD §2): the layout degrades gracefully
 * below 1024px but is not optimised for phones.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [condensed, setCondensed] = useState(false);

  /*
   * Condense past 160px of scroll.
   *
   * The handler reads `scrollY` directly and sets state only when the answer changes. Two
   * earlier attempts depended on the browser painting — an IntersectionObserver, then a
   * `requestAnimationFrame`-throttled listener — and neither fires in a tab that is not
   * compositing, which is also true of a background tab in a real browser. A comparison
   * against the last value is cheap enough not to need throttling and works everywhere.
   *
   * There is no feedback to damp here, which is what makes a plain threshold safe: folding
   * the row shortens the header and shifts the content below it up, but it does not change
   * `scrollY`, so the condition cannot re-trigger itself. 160px rather than the first pixel
   * because that shift is visible, and it is better for it to happen once, early, while the
   * reader is already moving.
   */
  useEffect(() => {
    const read = (): void => {
      const next = window.scrollY > 160;
      setCondensed((current) => (current === next ? current : next));
    };
    read();
    window.addEventListener('scroll', read, { passive: true });
    return () => window.removeEventListener('scroll', read);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <DemoBanner />
      <TopBar condensed={condensed} />
      {/* Global ⌘K, available on every route (PRD §12). */}
      <CommandPalette />
      {/* One panel for every card. Non-modal, so it is a sibling of the content, not a lid. */}
      <InsightsPanel />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-surface px-6 py-3">
        {/* PRD §16: a quiet standing reminder that this is not a finished product. */}
        <p className="text-micro text-muted">Demonstration build — synthetic data</p>
      </footer>
    </div>
  );
}

/**
 * Standard page padding and max width, shared by every page.
 *
 * When an insights panel is open the content is given an inline-end padding rather than
 * being covered by it: the reader has to be able to see and hover the chart the reading
 * describes. `w-96` plus the page gutter, and only from 1280px — below that the panel
 * docks to the bottom instead, where no horizontal room exists to give.
 */
export function PageBody({ children }: { children: ReactNode }) {
  const { openId } = useInsightsControls();
  return (
    <div
      className={`mx-auto w-full max-w-[1440px] px-6 py-6 ${
        openId ? 'xl:pe-[27rem] print:pe-6' : ''
      }`}
    >
      {children}
    </div>
  );
}
