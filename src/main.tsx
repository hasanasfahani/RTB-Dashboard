import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.tsx';
import { FiltersProvider } from './state/FiltersContext.tsx';
import { ReportsProvider } from './reports/ReportsContext.tsx';
import { InsightsPanelProvider } from './state/InsightsPanelContext.tsx';
import './index.css';

/*
 * No state is persisted anywhere (PRD §4): no localStorage, no sessionStorage, no
 * IndexedDB. A demo should always start from a known position.
 */
const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    {/* Opt in to the v7 behaviours now: PRD §13 allows no console warnings on the
        demo path, and these two are emitted on every page load otherwise. */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* Above the router, so filters persist across page and tab changes (PRD §12). */}
      <FiltersProvider>
        {/* Also above the router: a report survives navigating away to look something
            up and coming back. It does not survive a refresh — see ReportsContext. */}
        <ReportsProvider>
          {/* Inside the filters, because a filter change re-runs whatever reading is open. */}
          <InsightsPanelProvider>
            <App />
          </InsightsPanelProvider>
        </ReportsProvider>
      </FiltersProvider>
    </BrowserRouter>
  </StrictMode>,
);
