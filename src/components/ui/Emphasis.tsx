import { Fragment } from 'react';

/**
 * Renders `**bold**` spans inside a generated sentence.
 *
 * Findings are built in the data layer, which has no business emitting JSX, but a few of
 * them need to stress one clause — "**below** its regulatory floor". Markdown-style
 * markers keep the data layer plain text and let the card decide how emphasis looks.
 */
export function Emphasis({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <strong key={index} className="font-bold text-negative">
            {part}
          </strong>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
