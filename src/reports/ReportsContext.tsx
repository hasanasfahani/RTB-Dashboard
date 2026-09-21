import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  addBlock as addBlockTo,
  byRecency,
  createReport,
  moveBlock as moveBlockIn,
  removeBlock as removeBlockFrom,
  renameReport,
  setBlockScope as setBlockScopeIn,
  setBlockTitle as setBlockTitleIn,
  upsertReport,
  blockUsage,
  duplicateBlock as duplicateBlockIn,
  type BlockScope,
  type CustomReport,
} from './model.ts';
import { decodeReport } from './share.ts';

/**
 * Where reports live: React state, for the session (R1).
 *
 * PRD §4 rules out `localStorage`, `sessionStorage` and IndexedDB outright, and there is
 * no server. So a report lasts as long as the tab, and the **share link is the save
 * button** — the whole definition travels in the URL, which is also the one form of
 * "saving" that works for the thing a reader actually wants to do with a report, which is
 * send it to somebody.
 *
 * The page says so plainly rather than letting a reader discover it on refresh.
 *
 * The provider sits above the router, like `FiltersProvider`, so a report survives
 * navigating away to look something up and coming back.
 */
interface ReportsApi {
  /** Most recently edited first. */
  readonly reports: readonly CustomReport[];
  readonly get: (id: string) => CustomReport | undefined;
  /** Returns the new report, so the caller can navigate straight to it. */
  readonly create: (name?: string) => CustomReport;
  readonly remove: (id: string) => void;
  readonly rename: (id: string, name: string) => void;
  readonly addBlock: (id: string, blockId: string, scope?: BlockScope) => void;
  readonly removeBlock: (id: string, instanceId: string) => void;
  readonly duplicateBlock: (id: string, instanceId: string) => void;
  readonly moveBlock: (id: string, instanceId: string, to: number) => void;
  readonly setBlockScope: (id: string, instanceId: string, scope?: BlockScope) => void;
  readonly setBlockTitle: (id: string, instanceId: string, title?: string) => void;
  /** Decodes a share payload into a fresh report. `undefined` if the link is unreadable. */
  readonly importShared: (encoded: string) => CustomReport | undefined;
  /** How often each insight is used across every report — drives "you use these". */
  readonly usage: ReadonlyMap<string, number>;
}

const NOOP: ReportsApi = {
  reports: [],
  get: () => undefined,
  create: () => createReport(),
  remove: () => {},
  rename: () => {},
  addBlock: () => {},
  removeBlock: () => {},
  duplicateBlock: () => {},
  moveBlock: () => {},
  setBlockScope: () => {},
  setBlockTitle: () => {},
  importShared: () => undefined,
  usage: new Map(),
};

const ReportsContext = createContext<ReportsApi>(NOOP);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<readonly CustomReport[]>([]);

  /*
   * Every mutation goes through here: find the report, apply one of the pure functions
   * from `model.ts`, put the result back. The model already stamps `updatedAt` and
   * returns the identical object when nothing changed, so a no-op move cannot reorder the
   * index by touching a timestamp.
   */
  const edit = useCallback(
    (id: string, change: (report: CustomReport) => CustomReport) => {
      setReports((current) => {
        const existing = current.find((report) => report.id === id);
        if (!existing) return current;
        const next = change(existing);
        return next === existing ? current : upsertReport(current, next);
      });
    },
    [],
  );

  const create = useCallback((name?: string) => {
    const report = createReport(name);
    setReports((current) => upsertReport(current, report));
    return report;
  }, []);

  const importShared = useCallback((encoded: string) => {
    const report = decodeReport(encoded);
    if (!report) return undefined;
    setReports((current) => upsertReport(current, report));
    return report;
  }, []);

  const value = useMemo<ReportsApi>(() => {
    const ordered = byRecency(reports);
    return {
      reports: ordered,
      get: (id) => reports.find((report) => report.id === id),
      create,
      remove: (id) => setReports((current) => current.filter((report) => report.id !== id)),
      rename: (id, name) => edit(id, (report) => renameReport(report, name)),
      addBlock: (id, blockId, scope) => edit(id, (report) => addBlockTo(report, blockId, scope)),
      removeBlock: (id, instanceId) => edit(id, (report) => removeBlockFrom(report, instanceId)),
      duplicateBlock: (id, instanceId) => edit(id, (report) => duplicateBlockIn(report, instanceId)),
      moveBlock: (id, instanceId, to) => edit(id, (report) => moveBlockIn(report, instanceId, to)),
      setBlockScope: (id, instanceId, scope) =>
        edit(id, (report) => setBlockScopeIn(report, instanceId, scope)),
      setBlockTitle: (id, instanceId, title) =>
        edit(id, (report) => setBlockTitleIn(report, instanceId, title)),
      importShared,
      usage: blockUsage(reports),
    };
  }, [reports, create, edit, importShared]);

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports(): ReportsApi {
  return useContext(ReportsContext);
}
