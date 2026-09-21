import { useEffect, useRef, useState, type RefObject } from 'react';
import { motionAllowed } from './motion.ts';

/**
 * Reveal a card as it scrolls into view.
 *
 * This is the one form of chart motion that works across the whole library. Animating a
 * chart's *marks* only works for the 13 Recharts components — SVG `d` and `points` are
 * not animatable in CSS, so gauges, treemaps, Sankeys and the Lorenz curve cannot draw
 * themselves. A filter change that had some charts gliding while others jumped read as
 * breakage, and was rejected (plan §2.18).
 *
 * Revealing the **container** sidesteps that completely: every panel behaves identically
 * whatever is inside it, because the motion is one opacity and one transform on a
 * wrapper. It is also cheap — compositor-only, no per-frame JavaScript, and never more
 * than a screenful animating at once because it is driven by scroll position.
 *
 * Fires once per card. Falls back to visible whenever motion is unavailable, so content
 * can never be stranded invisible.
 */
/**
 * `''` renders plainly visible, `reveal` waits hidden, `reveal reveal-in` animates in.
 *
 * Three states rather than a boolean, because "make it visible" and "animate it into
 * view" must not be the same instruction. A failsafe that reveals by *starting an
 * animation* is no failsafe at all: wherever callbacks are not being delivered, frames
 * are not being painted either, so the animation sits frozen on its first keyframe and
 * the card stays blank. The escape hatch has to bypass motion entirely.
 */
export type RevealClass = '' | 'reveal' | 'reveal reveal-in';

export function useReveal<T extends HTMLElement>(): [RefObject<T>, RevealClass] {
  // `useRef<T>(null)` types as RefObject<T> in React 18, which is what `ref` expects.
  const ref = useRef<T>(null) as RefObject<T>;

  // Start plainly visible — never hidden — when motion is off or the API is missing.
  // Content that depends on JavaScript to become visible is content that can disappear.
  const [state, setState] = useState<'off' | 'waiting' | 'in'>(() =>
    !motionAllowed() || typeof IntersectionObserver === 'undefined' ? 'off' : 'waiting',
  );

  useEffect(() => {
    if (state !== 'waiting') return;
    const element = ref.current;
    if (!element) return;

    /*
     * Failsafe: if the observer never delivers *anything*, reveal regardless.
     *
     * A card starts at opacity 0 so it can fade in without flashing, which means the
     * only thing standing between the reader and a blank dashboard is the observer
     * firing. That is normally safe — but a page that is not compositing (a background
     * tab, a hidden panel, an automation context) gets no callbacks at all, and 54 cards
     * sit invisible indefinitely. Observed in exactly that state during development.
     *
     * The distinction that makes this precise: the observer reports on every element it
     * watches, intersecting or not, as soon as it runs at all. So a *first delivery* of
     * any kind proves it works, and the timer only fires when it genuinely never ran.
     * Below-the-fold cards are unaffected — their first report simply says "not
     * intersecting", which cancels the failsafe and leaves them waiting to be scrolled to.
     */
    let delivered = false;
    // `off`, not `in`: plainly visible, with no animation to depend on.
    const failsafe = window.setTimeout(() => {
      if (!delivered) setState('off');
    }, 2000);

    const observer = new IntersectionObserver(
      (entries) => {
        delivered = true;
        window.clearTimeout(failsafe);
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setState('in');
          observer.disconnect();
          return;
        }
      },
      {
        /*
         * The card must be **on screen** when it starts moving, or the animation is
         * wasted below the fold.
         *
         * A positive bottom margin extends the root past the viewport, so a card begins
         * its entrance while still hidden and has finished by the time it is seen —
         * which looks exactly like no animation at all. A negative margin pulls the
         * trigger line *up* into the viewport instead: the card is already a little way
         * in when it starts, and animates as it travels. That is the version you can see.
         *
         * -20% of a 768px viewport is about 150px in — far enough that the card is
         * plainly in frame before it starts, so the whole 750ms is watchable rather than
         * just its tail. The cost is a moment at the bottom edge during fast scrolling
         * where a card is mid-fade, which reads as arriving rather than as missing.
         */
        rootMargin: '0px 0px -20% 0px',
        threshold: 0,
      },
    );

    observer.observe(element);
    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
    };
  }, [state]);

  return [ref, state === 'off' ? '' : state === 'in' ? 'reveal reveal-in' : 'reveal'];
}
