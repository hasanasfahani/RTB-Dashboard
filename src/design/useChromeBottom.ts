import { useCallback, useEffect, useState } from 'react';

/**
 * Where the sticky chrome ends, in viewport pixels.
 *
 * The insights panel has to start below everything pinned to the top of the window, and
 * that is not one number. There are up to three things stacked there and only one of them
 * is a constant:
 *
 *   - the **banner**, which is in normal flow — so at the top of the page it pushes the
 *     bars down, and after ~40px of scroll it is gone;
 *   - the **top bar**, sticky at 0, whose height changes when the report rail appears, when
 *     a custom range opens a second row, and when it condenses on scroll (§2.28);
 *   - the **section tab bar**, sticky beneath it, which exists on the layer pages and not
 *     on a report or the detail page.
 *
 * `--header-h` describes only the second of those. Using it alone is what put the panel's
 * own header — and its close button — underneath the tab bar on Bank-Wide.
 *
 * So this measures rather than assumes: the bottom edge of whatever carries `data-chrome`,
 * whichever is lowest. Each of those elements publishes nothing and needs to know nothing
 * about the panel.
 *
 * `watch` is anything whose change means the set of pinned elements has changed — in
 * practice the route. The panel survives navigation, so a reader can open a reading on the
 * detail page, where there is no tab bar, and click through to a layer page, where there
 * is. Without re-attaching, the observer would be watching an element that has been
 * unmounted and the panel would sit over the new tab bar until the next scroll.
 *
 * **Scroll is the input that matters** and it is the one that cannot be proven in the
 * browser pane — `window.scrollTo` moves the page there without delivering a scroll event
 * (§2.28). A dispatched event does reach the listener, which is how the behaviour below was
 * checked. The `ResizeObserver` path needs no such caveat.
 */
export function useChromeBottom(watch?: unknown): number {
  const [bottom, setBottom] = useState(0);

  const measure = useCallback(() => {
    let lowest = 0;
    Array.from(document.querySelectorAll('[data-chrome]')).forEach((element) => {
      const edge = element.getBoundingClientRect().bottom;
      if (edge > lowest) lowest = edge;
    });
    /*
     * Rounded **up**, so a sub-pixel edge cannot leave the panel a fraction of a pixel
     * over the bar above it — and rounded at all so a fractional layout does not
     * re-render this on every scroll tick.
     */
    const next = Math.max(0, Math.ceil(lowest));
    setBottom((current) => (current === next ? current : next));
  }, []);

  /*
   * Measure now, and again once the frame has settled.
   *
   * The header condenses **on scroll**, so the same event that moves the page also changes
   * the height of the thing being measured — and React has not re-rendered it yet when the
   * listener runs. Reading twice, the second time on a zero-delay timeout, means the panel
   * does not sit one scroll event behind the bar it hangs from.
   *
   * A `ResizeObserver` would normally cover this, and one is attached below. It cannot be
   * relied on alone: its callbacks are delivered as part of the frame lifecycle, and the
   * browser pane this was built in runs neither that nor `requestAnimationFrame` (§2.28) —
   * verified directly, an observer on a resized element there fires zero times. The
   * timeout works in both.
   */
  const schedule = useCallback(() => {
    measure();
    window.setTimeout(measure, 0);
  }, [measure]);

  useEffect(() => {
    schedule();

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    /* The bars also change height without the page scrolling: the report rail appearing,
       a custom range opening a second row. */
    const observer = new ResizeObserver(measure);
    Array.from(document.querySelectorAll('[data-chrome]')).forEach((element) => observer.observe(element));

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, [measure, schedule, watch]);

  return bottom;
}
