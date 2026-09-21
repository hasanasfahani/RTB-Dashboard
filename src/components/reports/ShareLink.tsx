import { useEffect, useRef, useState } from 'react';
import { Check, Link2, Printer } from 'lucide-react';
import type { CustomReport } from '../../reports/model.ts';
import { shareUrl, shareWeight } from '../../reports/share.ts';
import { formatCount } from '../../design/format.ts';

/**
 * Copy link, and print. The two ways a report leaves the screen.
 *
 * Copying is the closest thing this product has to saving (R1), so the button says what
 * happened and the failure path is a real one rather than a swallowed promise: the clipboard
 * API needs a secure context and permission, and when it is refused the reader gets the URL in
 * a field they can select by hand. Silently doing nothing would look like the button is broken
 * and lose the report.
 */
export function ShareLink({ report }: { report: CustomReport }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const url = shareUrl(report, window.location.origin);
  const weight = shareWeight(report);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (state === 'manual') inputRef.current?.select();
  }, [state]);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
      timer.current = window.setTimeout(() => setState('idle'), 2200);
    } catch {
      setState('manual');
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          // Nothing on this row belongs on paper — the printed page is the report itself.
          className="flex items-center gap-1.5 rounded-chip border border-line px-2.5 py-1.5 text-micro font-bold text-navy hover:border-cyan hover:text-accent print:hidden"
        >
          {state === 'copied' ? (
            <>
              <Check size={13} strokeWidth={3} className="text-positiveInk" aria-hidden /> Link copied
            </>
          ) : (
            <>
              <Link2 size={13} strokeWidth={2.5} aria-hidden /> Copy link
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          aria-label="Print this report"
          className="flex items-center gap-1.5 rounded-chip border border-line px-2.5 py-1.5 text-micro font-bold text-navy hover:border-cyan hover:text-accent print:hidden"
        >
          <Printer size={13} strokeWidth={2.5} aria-hidden /> Print
        </button>
      </div>

      {state === 'manual' && (
        <div className="flex w-full max-w-md items-center gap-2 print:hidden">
          <input
            ref={inputRef}
            readOnly
            value={url}
            aria-label="Link to this report"
            className="min-w-0 flex-1 rounded-chip border border-line bg-canvas px-1.5 py-1 text-micro text-ink"
          />
          <span className="shrink-0 text-micro text-muted">copy this</span>
        </div>
      )}

      {weight.long && (
        <p className="max-w-md text-end text-micro leading-snug text-warningInk print:hidden">
          This link is {formatCount(weight.chars)} characters. Some mail and chat clients cut
          links near 2,000, and the link is the only copy of this report.{' '}
          {weight.overrides > 0
            ? `Its ${weight.overrides} ${weight.overrides === 1 ? 'block that carries' : 'blocks that carry'} its own slice or title ${weight.overrides === 1 ? 'is' : 'are'} most of the length.`
            : 'Fewer blocks would shorten it.'}
        </p>
      )}
    </div>
  );
}
