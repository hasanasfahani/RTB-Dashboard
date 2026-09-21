import { deltaTone, formatDelta } from '../../design/format.ts';

const TONE_CLASS = {
  positive: 'text-positiveInk',
  negative: 'text-negative',
  neutral: 'text-muted',
} as const;

interface DeltaProps {
  value: number;
  /** PRD §9: down is good for cost, NPL, CIR and impairment. */
  downIsGood?: boolean;
  /** Use the inverted palette on the navy headline band. */
  onDark?: boolean;
  className?: string;
}

/**
 * A signed delta with direction colour. The sign is arithmetic, the colour is
 * per-metric — never per-sign (PRD §9).
 */
export function Delta({ value, downIsGood = false, onDark = false, className = '' }: DeltaProps) {
  const tone = deltaTone(value, downIsGood);
  // On navy, the positive green and negative red both fail contrast, so the band uses
  // the light ramp and lets the arrow carry direction.
  const colour = onDark ? (tone === 'neutral' ? 'text-series-6' : 'text-series-4') : TONE_CLASS[tone];
  const arrow = value === 0 ? '' : value > 0 ? '▲' : '▼';

  return (
    <span className={`inline-flex items-baseline gap-1 text-micro font-bold ${colour} ${className}`}>
      <span aria-hidden="true">{arrow}</span>
      <span>{formatDelta(value)}</span>
    </span>
  );
}
