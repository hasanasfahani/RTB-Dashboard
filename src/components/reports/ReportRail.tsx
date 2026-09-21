import { NavLink } from 'react-router-dom';
import { useReports } from '../../reports/ReportsContext.tsx';
import { railSlice } from '../../reports/layout.ts';

/**
 * The reader's own reports, one row under the main nav.
 *
 * **It renders nothing until there is something to show.** Reports are session-only, so a
 * fresh demo has none and the header is exactly as it was before this feature existed — no
 * empty rail, no fourth row of chrome above 163 insights. The row appears the moment the
 * first report is made, which is also the moment it becomes worth a permanent place.
 *
 * A rail rather than a dropdown on the nav item. A dropdown hides the feature, and half the
 * point of putting reports in the header is that a presenter can show they exist. The cost is
 * the width, which is why it is capped.
 */
export function ReportRail() {
  const { reports } = useReports();
  if (reports.length === 0) return null;

  // `reports` is already most-recently-edited first, which keeps the one being worked on at
  // the front of the rail.
  const { shown, hidden } = railSlice(reports);

  return (
    <nav
      aria-label="Your reports"
      className="flex items-center gap-x-1 overflow-hidden border-t border-line px-6 py-1"
    >
      <span className="shrink-0 pe-1 text-label text-muted">Your reports</span>
      {shown.map((report) => (
        <NavLink
          key={report.id}
          to={`/reports/${report.id}`}
          className={({ isActive }) =>
            [
              // `max-w` and `truncate`: the name is the reader's, and one long one must not
              // push the rest of the rail off the screen.
              'min-w-0 max-w-[15rem] truncate rounded-chip px-2 py-0.5 text-micro transition-colors',
              isActive ? 'bg-navy font-bold text-surface' : 'text-muted hover:bg-canvas hover:text-ink',
            ].join(' ')
          }
          title={report.name}
        >
          {report.name}
          {/* Omitted at zero rather than shown as a `0`, which only invites the question. */}
          {report.blocks.length > 0 && (
            <span className="ms-1.5 font-normal opacity-70">{report.blocks.length}</span>
          )}
        </NavLink>
      ))}
      {hidden > 0 && (
        <NavLink to="/reports" className="shrink-0 px-2 py-0.5 text-micro font-bold text-accent hover:underline">
          +{hidden} more
        </NavLink>
      )}
    </nav>
  );
}
