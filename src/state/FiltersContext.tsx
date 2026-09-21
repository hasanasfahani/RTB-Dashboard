import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BranchFilter, CurrencyFilter, DivisionFilter, Filters, Period } from '../types.ts';
import { DEFAULT_FILTERS } from '../data/filters.ts';

/**
 * Global filter state (PRD §12).
 *
 * React state and context only — no Redux, no Zustand, no query library (PRD §4). And
 * nothing is persisted: state resets on refresh, deliberately, so a demo always starts
 * from a known position.
 *
 * The provider sits above the router, so filters survive page and tab changes.
 */
interface FiltersApi {
  readonly filters: Filters;
  readonly setPeriod: (period: Period) => void;
  /** Both ends of a custom range. Setting it also switches the period to `custom`. */
  readonly setRange: (from: string, to: string) => void;
  readonly setBranch: (branch: BranchFilter) => void;
  readonly setDivision: (division: DivisionFilter) => void;
  readonly setCurrency: (currency: CurrencyFilter) => void;
  readonly reset: () => void;
  readonly isDefault: boolean;
}

/**
 * The default is a working no-op rather than `undefined`, so a component that reads
 * filters outside the provider — `/dev/gallery` renders charts standalone — still
 * renders with the default selection instead of throwing.
 */
const FiltersContext = createContext<FiltersApi>({
  filters: DEFAULT_FILTERS,
  setPeriod: () => {},
  setRange: () => {},
  setBranch: () => {},
  setDivision: () => {},
  setCurrency: () => {},
  reset: () => {},
  isDefault: true,
});

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  /*
   * Leaving `custom` drops `from`/`to` rather than keeping them around unused — the keys are
   * **deleted**, because `'from' in filters` is what the share link and the block scope read
   * to decide there is a range to carry.
   */
  const setPeriod = useCallback(
    (period: Period) =>
      setFilters((f) => {
        if (period === 'custom') return { ...f, period };
        const { from: _from, to: _to, ...rest } = f;
        return { ...rest, period };
      }),
    [],
  );

  const setRange = useCallback(
    (from: string, to: string) =>
      setFilters((f) => ({ ...f, period: 'custom' as const, from, to })),
    [],
  );
  const setBranch = useCallback((branch: BranchFilter) => setFilters((f) => ({ ...f, branch })), []);
  const setDivision = useCallback((division: DivisionFilter) => setFilters((f) => ({ ...f, division })), []);
  const setCurrency = useCallback((currency: CurrencyFilter) => setFilters((f) => ({ ...f, currency })), []);
  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const value = useMemo<FiltersApi>(
    () => ({
      filters,
      setPeriod,
      setRange,
      setBranch,
      setDivision,
      setCurrency,
      reset,
      isDefault:
        filters.period === DEFAULT_FILTERS.period &&
        filters.from === undefined &&
        filters.branch === DEFAULT_FILTERS.branch &&
        filters.division === DEFAULT_FILTERS.division &&
        filters.currency === DEFAULT_FILTERS.currency,
    }),
    [filters, setPeriod, setRange, setBranch, setDivision, setCurrency, reset],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersApi {
  return useContext(FiltersContext);
}
