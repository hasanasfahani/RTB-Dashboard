import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.tsx';
import { Executive } from './pages/Executive.tsx';
import { InsightPage } from './pages/InsightPage.tsx';
import { InsightDetail } from './pages/InsightDetail.tsx';
import { DevGallery } from './pages/DevGallery.tsx';
import { ReportsIndex } from './pages/ReportsIndex.tsx';
import { ReportView } from './pages/ReportView.tsx';

/**
 * Each analytical layer is a nav item, and section tabs are URL segments, e.g.
 * `/retail/deposits-liabilities`.
 *
 * This no longer mirrors PRD §10: `/methodology` and `/catalogue` were removed at the
 * owner's request — see plan §2.23. Anything still pointing at them would 404, so the
 * catch-all below sends stale links home rather than to a dead end.
 */
export function App() {
  return (
    <AppShell>
      <Routes>
        {/*
          * Executive 360° is the front door.
          *
          * The cover page it replaced described the build rather than the bank — useful once,
          * on the first visit, and in the way on every one after. `/executive` keeps its own
          * path so links and the nav item still resolve; `/` renders the same page rather
          * than redirecting, so the address a reader lands on is the one they typed.
          */}
        <Route path="/" element={<Executive />} />
        <Route path="/executive/:section?" element={<Executive />} />

        {/* One component serves all three (PRD §11.2); the section slug is the tab. */}
        <Route path="/bank-wide/:section?" element={<InsightPage layer="bank-wide" />} />
        <Route path="/retail/:section?" element={<InsightPage layer="retail" />} />
        <Route path="/corporate/:section?" element={<InsightPage layer="corporate" />} />

        {/* `/reports` is also where a share link lands, carrying `?r=`. */}
        <Route path="/reports" element={<ReportsIndex />} />
        <Route path="/reports/:id" element={<ReportView />} />

        <Route path="/insight/:id" element={<InsightDetail />} />
        <Route path="/dev/gallery" element={<DevGallery />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
