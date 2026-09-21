import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';

/**
 * Click the title to rename it. Enter commits, Escape reverts, blur commits.
 *
 * An always-visible text input would make a report page look like a form. A heading that
 * becomes an input on click reads as a document, which is what a report is — but a
 * heading that gives no sign it can be edited is a heading, so the pencil appears on
 * hover and the whole thing is a real button for the keyboard.
 */
export function EditableTitle({
  value,
  onChange,
  className = '',
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    setEditing(false);
    // An empty name falls back to the existing one rather than to a blank heading; the
    // model would substitute its default, which is not what the reader typed either.
    const trimmed = draft.trim();
    if (trimmed.length > 0 && trimmed !== value) onChange(trimmed);
    else setDraft(value);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        aria-label="Report name"
        className={`w-full max-w-2xl border-b-2 border-cyan bg-transparent outline-none ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Rename this report"
      className={`group/title flex items-baseline gap-2 text-start ${className}`}
    >
      <span>{value}</span>
      <Pencil
        size={14}
        aria-hidden
        className="shrink-0 self-center text-muted opacity-0 transition-opacity group-hover/title:opacity-100"
      />
    </button>
  );
}
