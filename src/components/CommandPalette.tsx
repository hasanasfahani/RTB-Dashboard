import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { insights, sectionOf } from '../data/insights.ts';
import { IdChip } from './ui/Badge.tsx';
import type { Insight } from '../types.ts';

/**
 * ⌘K / Ctrl+K — search all 163 insights by id or title (PRD §12).
 *
 * "Cheap to build, and it demonstrates depth in one keystroke better than any menu."
 */
const MAX_RESULTS = 12;

interface Scored {
  readonly insight: Insight;
  readonly score: number;
}

/**
 * Lower is better. An id match beats a title prefix, which beats a title substring,
 * which beats a section match — so typing `R-17` puts R-17 first and typing
 * `concentration` puts the concentration insights first.
 */
function score(insight: Insight, query: string): number | undefined {
  const q = query.toLowerCase();
  const id = insight.id.toLowerCase();
  const title = insight.title.toLowerCase();

  if (id === q) return 0;
  if (id.startsWith(q)) return 1;
  if (title.startsWith(q)) return 2;

  const inTitle = title.indexOf(q);
  if (inTitle >= 0) return 3 + inTitle / 1000;
  if (insight.group.toLowerCase().includes(q)) return 5;
  if (insight.whatItTells.toLowerCase().includes(q)) return 6;
  return undefined;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const results = useMemo<readonly Scored[]>(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      // With no query, offer the demo path — the 36 that carry the narrative.
      return insights
        .filter((insight) => insight.demoPath)
        .slice(0, MAX_RESULTS)
        .map((insight) => ({ insight, score: 0 }));
    }
    return insights
      .flatMap((insight) => {
        const value = score(insight, trimmed);
        return value === undefined ? [] : [{ insight, score: value }];
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_RESULTS);
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
  }, []);

  // Global shortcut. ⌘K on Mac, Ctrl+K elsewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const go = (insight: Insight): void => {
    close();
    navigate(`/insight/${insight.id}`);
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = results[active]?.insight;
      if (chosen) go(chosen);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search insights"
      onClick={close}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-card border border-line bg-surface shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search size={15} className="shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search 163 insights by id or title…"
            className="w-full bg-transparent text-body text-ink outline-none placeholder:text-muted"
            aria-label="Search insights"
          />
          <kbd className="shrink-0 rounded-chip border border-line px-1.5 py-0.5 text-micro text-muted">
            esc
          </kbd>
        </div>

        <ul className="max-h-[52vh] overflow-y-auto">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-body text-muted">
              Nothing matches “{query}”.
            </li>
          )}
          {results.map((result, index) => {
            const section = sectionOf(result.insight);
            return (
              <li key={result.insight.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(result.insight)}
                  className={[
                    'flex w-full items-center gap-3 px-4 py-2 text-start transition-colors',
                    index === active ? 'bg-canvas' : '',
                  ].join(' ')}
                >
                  <IdChip id={result.insight.id} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-ink">{result.insight.title}</span>
                    <span className="block truncate text-micro text-muted">
                      {result.insight.layerLabel} › {section.label}
                    </span>
                  </span>
                  {result.insight.demoPath && (
                    <span className="shrink-0 text-micro text-accent" title="On the CEO narrative path">
                      ●
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <footer className="border-t border-line px-4 py-2 text-micro text-muted">
          {query.trim().length === 0
            ? 'Showing the 36 insights on the demo path — type to search all 163'
            : `${results.length} of 163`}
          <span className="ms-3">↑↓ to move · ↵ to open</span>
        </footer>
      </div>
    </div>
  );
}
