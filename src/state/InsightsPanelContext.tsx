import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Filters, Insight } from '../types.ts';
import { filterKey } from '../data/filters.ts';
import { LOCAL_MS, STAGES, isAbort, runInsight, type InsightRun } from '../data/insightProvider.ts';
import { prefersReducedMotion } from '../design/motion.ts';
import { useFilters } from './FiltersContext.tsx';

/**
 * Which card's reading is open, and the run producing it.
 *
 * One panel, not one per card: opening a second card's insights replaces the content
 * rather than stacking a second panel. That is also why this is context rather than state
 * inside `InsightCard` — the panel is rendered once, by the shell.
 *
 * ## Why a filter change has to reach this
 *
 * The panel is non-modal, so a reader can keep working the filters while it is open. A
 * reading that describes a slice the chart is no longer drawing is the one failure mode
 * that makes the whole feature untrustworthy, so any change to the selection re-runs it.
 * Debounced, because dragging Period through 3M → 6M → 12M is one decision, not three.
 */

/** ~400ms: long enough to coalesce a walk through the period options, short enough to feel live. */
const DEBOUNCE_MS = 400;

interface Target {
  readonly insight: Insight;
  readonly filters: Filters;
  /**
   * True for a report block, whose slice is its own rather than the header's.
   *
   * A pinned target does not follow the global filters here; its card pushes a new view
   * with `sync` when its own scope resolution changes. Without this the panel would quietly
   * swap a block's scope for the page's the moment anything else changed.
   */
  readonly pinned: boolean;
}

/**
 * Split in two, and the split is load-bearing.
 *
 * The progress bar ticks about sixteen times a second. Every card carries a button, and
 * Retail renders 78 of them, so a single context would re-render 78 buttons per tick for
 * a bar none of them draw. The controls change only when a panel opens or closes; the run
 * changes constantly and is read by exactly one component.
 */
interface InsightsControls {
  readonly open: (insight: Insight, filters?: Filters) => void;
  readonly sync: (id: string, filters: Filters) => void;
  readonly close: () => void;
  /** The insight whose reading is open, so a button can show itself as active. */
  readonly openId: string | undefined;
}

interface InsightsRunState {
  readonly target: Target | undefined;
  readonly run: InsightRun | undefined;
  readonly loading: boolean;
  /** 0–100. Holds at 90 until a live response lands, so it never completes early. */
  readonly progress: number;
  readonly stage: string;
}

const ControlsContext = createContext<InsightsControls>({
  open: () => {},
  sync: () => {},
  close: () => {},
  openId: undefined,
});

const RunContext = createContext<InsightsRunState>({
  target: undefined,
  run: undefined,
  loading: false,
  progress: 0,
  stage: STAGES[0] ?? '',
});

/** The bar holds here until there is something to show — see `progress`. */
const HOLD_AT = 90;

export function InsightsPanelProvider({ children }: { children: ReactNode }) {
  const { filters } = useFilters();
  const [target, setTarget] = useState<Target | undefined>(undefined);
  const [run, setRun] = useState<InsightRun | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const abortRef = useRef<AbortController | undefined>(undefined);
  /** The selection the visible reading was generated for, so a re-run is only a real change. */
  const generatedFor = useRef<string | undefined>(undefined);

  const open = useCallback(
    (insight: Insight, own?: Filters) =>
      setTarget({ insight, filters: own ?? filters, pinned: own !== undefined }),
    [filters],
  );

  const close = useCallback(() => {
    abortRef.current?.abort();
    setTarget(undefined);
    setRun(undefined);
    setLoading(false);
    generatedFor.current = undefined;
  }, []);

  /** A report block telling the panel its own scope has moved. */
  const sync = useCallback((id: string, own: Filters) => {
    setTarget((current) =>
      current && current.insight.id === id && filterKey(current.filters) !== filterKey(own)
        ? { ...current, filters: own }
        : current,
    );
  }, []);

  // A card's own slice is the global one unless the card said otherwise.
  useEffect(() => {
    setTarget((current) =>
      current && !current.pinned && filterKey(current.filters) !== filterKey(filters)
        ? { ...current, filters }
        : current,
    );
  }, [filters]);

  const id = target?.insight.id;
  const key = target ? `${id}:${filterKey(target.filters)}` : undefined;

  useEffect(() => {
    if (!target || !key) return undefined;

    /*
     * The in-flight run is abandoned, never merged. Without this, a slow run started under
     * one selection can land after a faster one started under the next and overwrite it —
     * the panel would show a reading for a slice the reader had already left.
     */
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const isFirst = generatedFor.current === undefined;
    setRun(undefined);
    setLoading(true);
    setProgress(0);

    const start = setTimeout(
      () => {
        void runInsight(target.insight, target.filters, controller.signal)
          .then((result) => {
            if (controller.signal.aborted) return;
            generatedFor.current = key;
            setRun(result);
            setProgress(100);
            setLoading(false);
          })
          .catch((error: unknown) => {
            // An abort is the expected end of a superseded run, not a failure to report.
            if (isAbort(error) || controller.signal.aborted) return;
            setLoading(false);
          });
      },
      // Opening is a click and should feel like one; a filter change is a decision still being made.
      isFirst ? 0 : DEBOUNCE_MS,
    );

    return () => {
      clearTimeout(start);
      controller.abort();
    };
  }, [key, target]);

  /*
   * The bar.
   *
   * Driven here rather than in CSS because it has to stop: under `live` there is no known
   * duration, so it crosses the scripted stages and then holds at 90 until the response
   * lands. A bar that reaches 100 before there is anything to read is a lie about progress.
   */
  useEffect(() => {
    if (!loading) return undefined;
    const reduced = prefersReducedMotion();
    const step = reduced ? LOCAL_MS / STAGES.length : 60;
    const timer = setInterval(() => {
      setProgress((current) => {
        if (current >= HOLD_AT) return HOLD_AT;
        // Reduced motion gets the same bar in whole stages, without the interpolation.
        const increment = reduced ? HOLD_AT / STAGES.length : (HOLD_AT * step) / LOCAL_MS;
        return Math.min(HOLD_AT, current + increment);
      });
    }, step);
    return () => clearInterval(timer);
  }, [loading]);

  const stage =
    STAGES[Math.min(STAGES.length - 1, Math.floor((progress / (HOLD_AT + 1)) * STAGES.length))] ??
    STAGES[0] ??
    '';

  const controls = useMemo<InsightsControls>(
    () => ({ open, sync, close, openId: id }),
    [open, sync, close, id],
  );
  const state = useMemo<InsightsRunState>(
    () => ({ target, run, loading, progress, stage }),
    [target, run, loading, progress, stage],
  );

  return (
    <ControlsContext.Provider value={controls}>
      <RunContext.Provider value={state}>{children}</RunContext.Provider>
    </ControlsContext.Provider>
  );
}

/** For the buttons on the cards. Does not re-render while the bar is moving. */
export function useInsightsControls(): InsightsControls {
  return useContext(ControlsContext);
}

/** For the panel itself, which is the only thing that draws the bar. */
export function useInsightsRun(): InsightsRunState {
  return useContext(RunContext);
}
