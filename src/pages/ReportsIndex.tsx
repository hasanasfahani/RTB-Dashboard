import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageBody } from '../components/layout/AppShell.tsx';
import { ConfirmButton } from '../components/reports/ConfirmButton.tsx';
import { useReports } from '../reports/ReportsContext.tsx';
import { tryBlockDef, BLOCKS } from '../reports/catalogue.ts';
import { SHARE_PARAM } from '../reports/share.ts';
import { blockHasScope, type CustomReport } from '../reports/model.ts';
import { formatDateLong } from '../design/format.ts';

/**
 * `/reports` — the list, and where a shared link lands.
 */
export function ReportsIndex() {
  const { reports, create, remove, importShared } = useReports();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [linkError, setLinkError] = useState(false);

  const shared = params.get(SHARE_PARAM);

  /*
   * A share link carries the whole report in the URL, so landing here means importing it.
   *
   * The ref guard is not decoration: StrictMode runs effects twice in development, and
   * without it opening a link would produce two identical reports. Keyed on the payload
   * so a *different* link in the same session still imports.
   */
  const imported = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!shared || imported.current === shared) return;
    imported.current = shared;

    const report = importShared(shared);
    // The param is dropped either way: leaving it on would re-import on every back
    // navigation, and the reader's copy is theirs now — it is not this URL any more.
    setParams(new URLSearchParams(), { replace: true });

    if (report) navigate(`/reports/${report.id}`, { replace: true });
    else setLinkError(true);
  }, [shared, importShared, navigate, setParams]);

  return (
    <PageBody>
      <header className="mb-6 border-b-2 border-navy pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-h1 text-navy">Reports</h2>
          <button
            type="button"
            onClick={() => navigate(`/reports/${create().id}`)}
            className="flex items-center gap-1.5 rounded-chip bg-navy px-3 py-1.5 text-micro font-bold text-surface hover:bg-accent"
          >
            <Plus size={13} strokeWidth={3} aria-hidden /> New report
          </button>
        </div>
        <p className="mt-2 max-w-3xl text-body text-muted">
          Put any of the {BLOCKS.length} insights on a page of your own, in your own order, each
          reading whichever slice you point it at.
        </p>
        <p className="mt-1 text-micro text-muted">
          Reports last for this session — nothing is saved to this machine. A report's link carries
          the whole thing, so sharing it is also how you keep it.
        </p>
      </header>

      {linkError && (
        <p className="mb-6 border-s-2 border-negative bg-surface px-3 py-2 text-body text-ink">
          That link could not be read. It may have been shortened or cut off in transit — the whole
          report travels inside the link, so it has to arrive intact.
        </p>
      )}

      {reports.length === 0 ? (
        <p className="max-w-2xl text-body text-muted">
          No reports yet. <span className="text-ink">New report</span> starts one, and it will suggest
          a few blocks to begin with.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {reports.map((report) => (
            <li key={report.id} className="flex items-start justify-between gap-6 py-3">
              <div className="min-w-0">
                <Link to={`/reports/${report.id}`} className="text-h2 text-navy hover:text-accent">
                  {report.name}
                </Link>
                <p className="mt-0.5 text-micro text-muted">{summarise(report)}</p>
              </div>
              <ConfirmButton
                label="Delete"
                confirmLabel="Delete for good?"
                onConfirm={() => remove(report.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </PageBody>
  );
}

/**
 * The one line under a report's name.
 *
 * Block count, then how many carry their own slice, then the first few names — enough to
 * tell two reports apart without opening either, which is the whole job of a list.
 */
function summarise(report: CustomReport): string {
  const count = report.blocks.length;
  if (count === 0) return `Empty · started ${formatDateLong(report.createdAt)}`;

  const scoped = report.blocks.filter(blockHasScope).length;
  const names = report.blocks
    .slice(0, 3)
    .map((block) => block.title ?? tryBlockDef(block.blockId)?.label ?? block.blockId);

  const parts = [`${count} ${count === 1 ? 'block' : 'blocks'}`];
  if (scoped > 0) parts.push(`${scoped} with its own slice`);
  parts.push(names.join(', ') + (count > names.length ? `, +${count - names.length} more` : ''));
  return parts.join(' · ');
}
