import { NavLink } from 'react-router-dom';
import { LAYERS } from '../../types.ts';
import { byLayer, sectionsFor } from '../../data/insights.ts';
import { useReports } from '../../reports/ReportsContext.tsx';

interface NavItem {
  to: string;
  label: string;
  count?: number;
}

/**
 * The main navigation. Insight counts are derived from the catalogue so the nav cannot
 * drift from the content.
 *
 * Methodology and Catalogue were removed at the owner's request (plan §2.23), which is a
 * deliberate departure from PRD §10.
 */
const LAYER_LABEL: Record<(typeof LAYERS)[number], string> = {
  executive: 'Executive 360°',
  'bank-wide': 'Bank-Wide',
  retail: 'Retail',
  corporate: 'Corporate',
};

export const NAV_ITEMS: readonly NavItem[] = [
  ...LAYERS.map((layer) => ({
    to: `/${layer}`,
    label: LAYER_LABEL[layer],
    count: byLayer(layer).length,
  })),
  // The count is filled in at render time — it is the only one that moves.
  { to: '/reports', label: 'Reports' },
];

export function MainNav() {
  const { reports } = useReports();

  /*
   * Every other count here is a fact about the catalogue and is computed once at module
   * load. This one changes, and it is the whole signal that the reader has work in progress,
   * so it is read per render — and left off entirely at zero rather than shown as a `0`.
   */
  const countFor = (to: string): number | undefined =>
    to === '/reports' ? (reports.length > 0 ? reports.length : undefined) : undefined;

  return (
    /* Scrolls rather than wraps: the bar is one row now, and a wrapped nav would undo that. */
    <nav aria-label="Main" className="no-scrollbar flex items-stretch gap-0 overflow-x-auto">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            [
              'relative flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-h2 transition-colors',
              isActive ? 'text-navy' : 'text-muted hover:text-ink',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <span>{item.label}</span>
              {(item.count ?? countFor(item.to)) !== undefined && (
                <span className="text-micro font-bold text-muted">
                  {item.count ?? countFor(item.to)}
                </span>
              )}
              {/* Active: navy text, 2px cyan underline (PRD §11.2). */}
              {isActive && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** Section count for a layer, used in page headers. */
export function sectionCount(layer: (typeof LAYERS)[number]): number {
  return sectionsFor(layer).length;
}
