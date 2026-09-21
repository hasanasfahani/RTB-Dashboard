import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'navy' | 'cyan' | 'positive' | 'warning' | 'negative';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-canvas text-muted',
  navy: 'bg-navy text-surface',
  cyan: 'bg-accent text-surface',
  positive: 'bg-positiveInk text-surface',
  warning: 'bg-warningInk text-surface',
  negative: 'bg-negative text-surface',
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

/**
 * `data-chip` is the hook the print stylesheet restyles by.
 *
 * A filled badge is a CSS background, and browsers drop backgrounds when printing unless the
 * reader ticks "Background graphics" — off by default. A navy badge would print as white text
 * on white paper, so print swaps every chip to a border and ink. Print needs a way to find
 * them that does not depend on a Tailwind class name.
 */
export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      data-chip={tone}
      className={`inline-flex items-center rounded-chip px-1.5 py-0.5 text-micro font-bold ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Monospaced insight id, e.g. `R-17`. Carries the same print hook — see `Badge`. */
export function IdChip({ id }: { id: string }) {
  return (
    <span
      data-chip="id"
      className="rounded-chip bg-canvas px-1.5 py-0.5 text-micro font-bold tracking-wider text-navy"
    >
      {id}
    </span>
  );
}
