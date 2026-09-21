/**
 * The share link. With reports held only in memory, this **is** the save button.
 *
 * The whole definition travels in the URL — no server, nothing stored. A colleague on
 * another machine opens the link and gets their own copy.
 *
 * Three rules that are not negotiable:
 *
 *   - **Base64url over UTF-8 bytes**, never `btoa` on the string. `btoa` throws on
 *     anything outside Latin-1, and PRD §9 already anticipates Arabic; a report named in
 *     Arabic must not produce a link that cannot be created.
 *   - The payload carries the **name** as well as the blocks. A link that reproduced the
 *     panels under the wrong title would be sharing a different document.
 *   - Decoding produces a **new** report — fresh ids, fresh timestamps. Opening someone's
 *     link gives you your own copy to edit, not a shared object that two people disagree
 *     about with no server to arbitrate.
 */

import type { BlockScope, CustomReport, ReportBlock } from './model.ts';
import { cleanScope, makeId, stamp, DEFAULT_REPORT_NAME } from './model.ts';

/** Minimised on purpose: this goes in a URL that someone may paste into a chat window. */
interface SharePayload {
  /** name */
  readonly n: string;
  /**
   * Blocks, as `[blockId]`, `[blockId, scope]` or `[blockId, scope|null, title]`.
   *
   * `null` rather than a hole in the third form: JSON has no sparse arrays, and a block
   * with a title but no scope has to say so positionally.
   */
  readonly b: readonly ShareEntry[];
}

type ShareEntry =
  | readonly [string]
  | readonly [string, BlockScope]
  | readonly [string, BlockScope | null, string];

export const SHARE_PARAM = 'r';

/**
 * Where a link stops being safe to paste into a message.
 *
 * Not a browser limit — Chrome and Safari carry far more than this in the address bar, and
 * there is no server to impose one. It is a *transport* limit: mail clients and chat windows
 * wrap or truncate long URLs, and Outlook has broken links around 2,000 characters for
 * years. Since the link is the only way a report is kept (R1), a truncated one is lost work,
 * which is worth a sentence of warning rather than a silent failure days later.
 *
 * Measured: a plain forty-block report is about 550 characters. It takes a per-block scope
 * *and* a per-block title on every block to reach this — twelve such blocks come to 2,044 —
 * so the warning can name the thing that is actually making the link long.
 */
export const SHARE_WARN_CHARS = 2000;

/** Which part of a report is making its link long, in the reader's terms. */
export function shareWeight(report: CustomReport): {
  readonly chars: number;
  readonly long: boolean;
  readonly overrides: number;
} {
  const overrides = report.blocks.filter(
    (block) => cleanScope(block.scope) !== undefined || (block.title ?? '').length > 0,
  ).length;
  const chars = encodeReport(report).length;
  return { chars, long: chars > SHARE_WARN_CHARS, overrides };
}

// ---------------------------------------------------------------------------
// base64url, over bytes
// ---------------------------------------------------------------------------

function bytesToBinary(bytes: Uint8Array): string {
  // Chunked: spreading a large array into String.fromCharCode overflows the call stack,
  // and a forty-block report is big enough to matter.
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return binary;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return btoa(bytesToBinary(bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  // btoa strips padding; atob wants it back.
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ---------------------------------------------------------------------------

export function encodeReport(report: CustomReport): string {
  const payload: SharePayload = {
    n: report.name,
    b: report.blocks.map((block) => {
      const scope = cleanScope(block.scope);
      // Trailing entries are omitted rather than nulled, which keeps the common case —
      // a block with neither override — down to a single string in the array.
      if (block.title !== undefined && block.title.length > 0) {
        return [block.blockId, scope ?? null, block.title] as const;
      }
      if (scope) return [block.blockId, scope] as const;
      return [block.blockId] as const;
    }),
  };
  return toBase64Url(JSON.stringify(payload));
}

/**
 * A malformed or truncated link returns `null`, and the page says the link could not be
 * read — rather than building half a report from whatever survived.
 */
export function decodeReport(encoded: string): CustomReport | null {
  let payload: unknown;
  try {
    payload = JSON.parse(fromBase64Url(encoded));
  } catch {
    return null;
  }

  if (typeof payload !== 'object' || payload === null) return null;
  const record = payload as Partial<SharePayload>;
  if (!Array.isArray(record.b)) return null;

  const blocks: ReportBlock[] = [];
  for (const entry of record.b) {
    if (!Array.isArray(entry)) return null;
    const [blockId, scope, title] = entry as [unknown, unknown, unknown];
    if (typeof blockId !== 'string' || blockId.length === 0) return null;

    const cleaned =
      scope && typeof scope === 'object' ? cleanScope(scope as BlockScope) : undefined;

    blocks.push({
      id: makeId('b'),
      blockId,
      ...(cleaned ? { scope: cleaned } : {}),
      ...(typeof title === 'string' && title.trim().length > 0 ? { title: title.trim() } : {}),
    });
  }

  const at = stamp();
  const name = typeof record.n === 'string' && record.n.trim().length > 0 ? record.n.trim() : DEFAULT_REPORT_NAME;

  return { id: makeId('r'), name, createdAt: at, updatedAt: at, blocks };
}

/** `/reports?r=…` — the index is where a shared link lands. */
export function shareUrl(report: CustomReport, origin: string, indexPath = '/reports'): string {
  return `${origin}${indexPath}?${SHARE_PARAM}=${encodeReport(report)}`;
}

/** Pulls the payload out of a query string, if there is one. */
export function readShareParam(search: string): string | null {
  const value = new URLSearchParams(search).get(SHARE_PARAM);
  return value && value.length > 0 ? value : null;
}
