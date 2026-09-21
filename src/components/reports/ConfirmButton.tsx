import { useEffect, useRef, useState } from 'react';

/**
 * A destructive action that asks once, in place.
 *
 * `window.confirm` would do the job and looks like a browser alert in the middle of a
 * bank's report. Two clicks on the same control is quieter and keeps the question next to
 * the thing it is about. Nothing here is recoverable — a deleted report is gone, there
 * being nowhere to store it — so it does have to ask.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  // Disarms itself, so a control left armed cannot be triggered by a later stray click.
  useEffect(() => {
    if (!armed) return;
    timer.current = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer.current);
  }, [armed]);

  return (
    <button
      type="button"
      onClick={() => {
        if (armed) onConfirm();
        else setArmed(true);
      }}
      onBlur={() => setArmed(false)}
      className={
        armed
          ? 'rounded-chip bg-negative px-2 py-1 text-micro font-bold text-surface'
          : 'text-micro font-bold text-muted hover:text-negative'
      }
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
