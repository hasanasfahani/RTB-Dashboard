import { Sparkles } from 'lucide-react';
import type { Filters, Insight } from '../../types.ts';
import { useInsightsControls } from '../../state/InsightsPanelContext.tsx';

/**
 * The call to action, at the bottom-right of the chart it reads.
 *
 * It began as a text chip in the card header beside the id. Moved at the owner's request,
 * with a reference design: a filled, fully-rounded button. Two notes on honouring that
 * without walking away from decisions already taken.
 *
 * **The fill is `accent`, not `cyan`.** The reference reads as the brand cyan, but §2.24
 * measured `cyan` on white at 2.95:1 — below the 4.5:1 floor for text and below even the
 * 3:1 one for graphics. `accent` exists for exactly this: white on it is 5.31:1, which is
 * why it was specified as "the fill under a button label". It looks like the reference and
 * can be read at arm's length from the back of a boardroom.
 *
 * **The radius is `card`, and that is not a contradiction of §2.25.** That section rejected
 * a flat 16px because our controls were 19–23px tall, where it comes out at 0.70–0.85 of
 * the height — a pill, which reads consumer. This control is ~35px, where the same 16px is
 * about 0.45, right beside rtb.iq's own 40px buttons at 0.40. The shape the reference asks
 * for and the ratio the brand uses turn out to be the same thing once the control is the
 * size a call to action actually is. No new token.
 */
export function GenerateInsightsButton({
  insight,
  filters,
}: {
  insight: Insight;
  /** A report block's own slice. Omitted on a section card, which follows the global filters. */
  filters?: Filters;
}) {
  const { open, close, openId } = useInsightsControls();
  const isOpen = openId === insight.id;

  return (
    <button
      type="button"
      onClick={() => (isOpen ? close() : open(insight, filters))}
      aria-expanded={isOpen}
      aria-label={`Generate insights for ${insight.title}`}
      title="Read what this panel is saying, and what to do about it"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-card px-4 py-2 text-body font-bold shadow-sm print:hidden ${
        isOpen ? 'bg-navy text-surface' : 'bg-accent text-surface hover:bg-navy'
      }`}
    >
      <Sparkles size={14} strokeWidth={2.5} aria-hidden />
      {isOpen ? 'Insights open' : 'Generate Insights'}
    </button>
  );
}
