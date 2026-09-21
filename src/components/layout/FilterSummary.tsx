import { SlidersHorizontal } from 'lucide-react';
import { describeFilters } from '../../data/filters.ts';
import { useFilters } from '../../state/FiltersContext.tsx';

/**
 * The filter bar, condensed to one line.
 *
 * Shown in place of the controls once the reader has scrolled past the top. The filters apply
 * to every chart on screen, so they cannot simply be hidden — but they are read far more often
 * than they are changed, and a sentence saying what is in force costs 36px less than the row
 * that sets it. Clicking brings the row back.
 */
export function FilterSummary({ onOpen }: { onOpen: () => void }) {
  const { filters, isDefault } = useFilters();

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Change filters"
      title="Change filters"
      className={[
        'flex shrink-0 items-center gap-1.5 rounded-chip border px-2.5 py-1 text-micro transition-colors',
        isDefault
          ? 'border-line text-muted hover:border-accent hover:text-accent'
          : 'border-accent font-bold text-accent',
      ].join(' ')}
    >
      <SlidersHorizontal size={11} strokeWidth={2.5} aria-hidden />
      <span className="max-w-[22rem] truncate">{describeFilters(filters)}</span>
    </button>
  );
}
