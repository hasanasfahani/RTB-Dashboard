import { NavLink } from 'react-router-dom';
import type { Layer, Section } from '../../types.ts';

/**
 * The section tab bar (PRD §11.2).
 *
 * `All` is the default and the tab the demo uses. Then one tab per section in workbook
 * order, each carrying its insight count. Tab state lives in the URL — `/retail` is
 * All, `/retail/deposits-liabilities` is that section — so every tab is deep-linkable
 * and the back button works.
 *
 * The bar scrolls horizontally rather than wrapping: nine tabs exceed the width on
 * Bank-Wide and a second row would push the content down and shift the layout.
 */
export function SectionTabs({
  layer,
  sections,
  total,
  activeSlug,
}: {
  layer: Layer;
  sections: readonly Section[];
  total: number;
  /** `undefined` means the `All` tab. */
  activeSlug: string | undefined;
}) {
  return (
    /*
      * Sticks directly beneath the top bar, whose height it reads rather than assumes —
      * the report rail and an open custom range both change it. `z-20` keeps it under the
      * bar it hangs from.
      */
    <div
      data-chrome="tabs"
      className="sticky z-20 border-b border-line bg-surface"
      style={{ top: 'var(--header-h, 0px)' }}
    >
      <div className="mx-auto w-full max-w-[1440px] px-6">
        <nav
          aria-label="Sections"
          className="no-scrollbar fade-inline-end flex items-stretch gap-0 overflow-x-auto"
        >
          <Tab to={`/${layer}`} label="All" count={total} isActive={activeSlug === undefined} end />
          {sections.map((section) => (
            <Tab
              key={section.slug}
              to={`/${layer}/${section.slug}`}
              label={section.label}
              count={section.count}
              isActive={activeSlug === section.slug}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}

function Tab({
  to,
  label,
  count,
  isActive,
  end = false,
}: {
  to: string;
  label: string;
  count: number;
  isActive: boolean;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      // `replace` keeps a tab cycle from filling the history stack, so Back leaves the
      // page rather than walking every tab the presenter touched.
      replace
      className={[
        'relative flex shrink-0 items-start gap-1 whitespace-nowrap px-3 py-2.5 text-h2 transition-colors',
        isActive ? 'text-navy' : 'text-muted hover:text-ink',
      ].join(' ')}
      aria-current={isActive ? 'page' : undefined}
    >
      <span>{label}</span>
      {/* Superscript count chip (PRD §11.2): `Retail Lending ¹⁰`. */}
      <sup className="text-micro font-bold text-muted">{count}</sup>
      {isActive && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan" />}
    </NavLink>
  );
}
