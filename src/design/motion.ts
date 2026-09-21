import { useEffect, useState } from 'react';

/**
 * Motion, of which there is deliberately almost none.
 *
 * Charts do not animate — not on mount, and not on a data change. Mount animation would
 * turn Retail's 20ms tab switch into a 1500ms stutter across 78 panels; a transition on
 * change was built, reviewed and rejected in Phase 9 (plan §2.18).
 *
 * What survives is one moment: the Executive page states the bank's position and its
 * headline figure on arrival, once per session. That screen is eight cards rather than
 * fifty-four, and it is the one screen with an arrival worth marking — demo beat 1.
 *
 * To remove even that, set `MOTION_ENABLED` to false. Nothing else needs changing.
 */
export const MOTION_ENABLED = true;

/** The Executive arrival, once per session. Long enough to notice, short enough to ignore. */
export const ARRIVAL_MS = 520;

/**
 * Honours the operating system's reduced-motion setting.
 *
 * Read at call time rather than cached: a presenter may well turn it on between opening
 * the laptop and starting.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function motionAllowed(): boolean {
  return MOTION_ENABLED && !prefersReducedMotion();
}

/**
 * True exactly once per session, for the screen that has an arrival worth marking.
 *
 * Module scope rather than storage — PRD §4 allows no `localStorage`, and a flag that
 * resets on refresh is the right behaviour anyway: a demo should always start from a
 * known position, and the presenter may well reload before walking in.
 */
let hasArrived = false;

export function useArrival(): boolean {
  /*
   * Decided during the first render, claimed afterwards.
   *
   * The read is pure — it inspects the flag without touching it — so StrictMode's
   * double-invoke returns the same answer both times. That matters because the class has
   * to be on the element at its *first* paint. An earlier version claimed the arrival
   * inside an effect, which fired about 100ms late: the band painted fully visible, then
   * snapped to transparent and faded back in. That reads as a flicker, not an entrance.
   *
   * Claiming it is the side effect, so that happens in the effect where it belongs.
   */
  const [play] = useState(() => !hasArrived && motionAllowed());

  useEffect(() => {
    hasArrived = true;
  }, []);

  return play;
}

/** Test seam: lets a check re-arm the once-per-session flag. */
export function resetArrival(): void {
  hasArrived = false;
}
