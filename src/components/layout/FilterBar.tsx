import { X } from 'lucide-react';
import { PERIODS, type BranchFilter, type CurrencyFilter, type DivisionFilter, type Period } from '../../types.ts';
import { branches } from '../../data/entities.ts';
import { DEFAULT_FILTERS, DIVISIONS_LABEL, PERIOD_LABEL } from '../../data/filters.ts';
import { ASOF } from '../../data/bank.ts';
import { useState } from 'react';
import { useFilters } from '../../state/FiltersContext.tsx';

/**
 * The global filter bar (PRD §12).
 *
 * Four controls, applied across every chart on every screen and persisting across page
 * and tab changes.
 *
 * Period is a select like the other three. It was a segmented control while it held four
 * short options; at seven, two of which are sentences, a row of buttons stopped fitting and
 * stopped reading as the same kind of control as its neighbours.
 */
export function FilterBar() {
  const { filters, setPeriod, setBranch, setDivision, setCurrency, reset, isDefault } = useFilters();

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-6 py-1.5">
      <Select
        label="Period"
        value={filters.period}
        onChange={(value) => setPeriod(value as Period)}
        activeWhen={filters.period !== DEFAULT_FILTERS.period}
        options={PERIODS.map((period) => ({ value: period, label: PERIOD_LABEL[period] }))}
      />

      {filters.period === 'custom' && <CustomRange />}

      <Select
        label="Branch"
        value={filters.branch}
        onChange={(value) => setBranch(value as BranchFilter)}
        options={[
          { value: 'all', label: 'All branches' },
          ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
        ]}
      />

      <Select
        label="Division"
        value={filters.division}
        onChange={(value) => setDivision(value as DivisionFilter)}
        options={[
          { value: 'all', label: 'All divisions' },
          ...(['retail', 'corporate', 'treasury'] as const).map((division) => ({
            value: division,
            label: DIVISIONS_LABEL[division],
          })),
        ]}
      />

      <Select
        label="Currency"
        value={filters.currency}
        onChange={(value) => setCurrency(value as CurrencyFilter)}
        options={[
          { value: 'all', label: 'All currencies' },
          { value: 'IQD', label: 'IQD' },
          { value: 'USD', label: 'USD' },
          { value: 'OTHER', label: 'Other' },
        ]}
      />

      {!isDefault && (
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1 text-micro font-bold text-accent hover:underline"
        >
          <X size={11} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  activeWhen,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  /** Period has no `all`, so what counts as "changed" has to be said rather than inferred. */
  activeWhen?: boolean;
}) {
  const isActive = activeWhen ?? value !== 'all';
  return (
    <label className="flex items-center gap-2">
      <span className="text-label text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={[
          'rounded-chip border bg-surface px-2 py-1 text-micro transition-colors',
          isActive ? 'border-cyan font-bold text-navy' : 'border-line text-ink',
        ].join(' ')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The two ends of a custom range.
 *
 * Both are capped at the as-of date: this fixture describes a bank at one close, and there is
 * nothing after it to show. A range running into next month would draw a flat tail that reads
 * as a business result rather than as an absence of data.
 *
 * Applied only once both ends are set and in order, so a half-typed range never redraws the
 * page underneath the reader.
 */
function CustomRange() {
  const { filters, setRange } = useFilters();
  const [from, setFrom] = useState(filters.from ?? '');
  const [to, setTo] = useState(filters.to ?? ASOF);

  function apply(nextFrom: string, nextTo: string): void {
    setFrom(nextFrom);
    setTo(nextTo);
    if (nextFrom && nextTo && nextFrom <= nextTo) setRange(nextFrom, nextTo);
  }

  const invalid = from !== '' && to !== '' && from > to;

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5">
        <span className="text-label text-muted">From</span>
        <input
          type="date"
          value={from}
          max={to || ASOF}
          onChange={(event) => apply(event.target.value, to)}
          className="rounded-chip border border-line bg-surface px-2 py-1 text-micro text-ink"
        />
      </label>
      <label className="flex items-center gap-1.5">
        <span className="text-label text-muted">To</span>
        <input
          type="date"
          value={to}
          max={ASOF}
          onChange={(event) => apply(from, event.target.value)}
          className="rounded-chip border border-line bg-surface px-2 py-1 text-micro text-ink"
        />
      </label>
      {invalid && <span className="text-micro text-warningInk">From must be on or before To</span>}
    </div>
  );
}
