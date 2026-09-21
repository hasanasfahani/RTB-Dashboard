/**
 * The single source of colour, spacing and type in the application (PRD §9).
 *
 * A1 (plan §4): `tailwind.config.ts` builds its theme from this module, so a hardcoded
 * hex anywhere else is a defect. `npm run verify:tokens` enforces that.
 */

export const tokens = {
  color: {
    navy: '#00205B', // primary, headers, primary series
    cyan: '#00A5BD', // accent, secondary series, active state
    ink: '#1A2436', // body text
    muted: '#5C6B7F', // secondary text, axis labels — 5.43:1 on surface, 5.10:1 on canvas
    /**
     * Cyan, deepened, for anything that is **text** or carries a text label.
     *
     * `cyan` is the brand accent and stays exactly as the brand specifies it, but at
     * 2.95:1 on white it is not a text colour — it fails WCAG AA (4.5:1) and misses even
     * the 3:1 floor for large text and graphics. RT Bank's own site knows this: its fee
     * tables set figures in a deeper teal, not in the brand cyan.
     *
     * Their value is #008396, which clears AA on white (4.48:1) but **not** on our canvas
     * (4.20:1). One step deeper clears both — 5.31:1 on surface, 4.98:1 on canvas — and
     * white on it is 5.31:1, so it can also be the fill under a button label.
     */
    accent: '#00768A',
    /*
     * Neutrals, not blue-tinted — rtb.iq builds its surfaces from true greys (#F9F9F9 and
     * #F2F2F2) and reserves the blues for the brand. A blue-cast canvas competes quietly
     * with the navy it sits behind; a neutral one lets the navy be the only blue on screen.
     */
    line: '#E6E6E6', // borders, gridlines
    surface: '#FFFFFF',
    canvas: '#F9F9F9', // page background
    /*
     * Status hues, used as **fills and marks** — chart bands, RAG cells, the demo's
     * traffic lights. Unchanged, so no chart moves.
     */
    positive: '#2F8F5B',
    warning: '#E2A33C',
    negative: '#C0392B',
    /*
     * The same two status colours, darkened for **text**.
     *
     * The contrast gate found these after the cyan fix, which is the point of writing the
     * gate rather than the fix: white on the amber is 2.20:1, and it was setting a delta on
     * a bullet chart, a scenario bar, and the sentence warning that a share link is too
     * long to survive a mail client. Green was 4.04:1 — close enough to look fine and still
     * short of the line.
     *
     * `negative` needed no variant: #C0392B is already 5.44:1. It is listed here only so a
     * reader does not wonder why two of the three have partners.
     */
    positiveInk: '#256F47', // 6.10:1 on surface, 5.72:1 on canvas
    warningInk: '#8C6212', // 5.43:1 on surface, 5.09:1 on canvas
  },
  /** Series ramp. Navy first, cyan second, then the extended ramp (PRD §8). */
  series: ['#00205B', '#00A5BD', '#4C7FB8', '#8FD9E4', '#9BB0CC', '#D3E0EC'],
  /*
   * Two radii, because copying their number would not copy their look.
   *
   * rtb.iq uses 16px on everything — but its buttons are 40px tall, which makes the radius
   * **0.40 of the height**. Our controls are 19–23px tall, where a flat 16px comes out at
   * 0.70–0.85: a pill, which reads consumer and playful and is not what their page looks
   * like. Measured both, which is the only reason this is two values and not one.
   *
   * So `card` keeps their 16px, where our containers are near enough their size for it to
   * land the same way, and `chip` takes the *ratio* instead of the number — 8px, which is
   * 0.35–0.42 at our control heights, right on theirs.
   */
  radius: { card: 16, chip: 8 },
  space: [4, 8, 12, 16, 24, 32, 48],
  /*
   * The scale follows RT Bank's voice, which is lighter than this dashboard's was.
   *
   * Their headings are **medium, not bold** — 500 — with negative tracking that tightens as
   * the size grows (measured: -0.02em at 67px, -0.02em at 38.7px). Bold is reserved for
   * figures and for the small uppercase label. Setting every heading at 700, as this build
   * did, read heavier and more institutional than the brand itself does.
   *
   * Sizes are unchanged. Retuning weight and tracking changes the voice without moving a
   * single box, which keeps this separable from the density work.
   */
  type: {
    display: { size: 32, leading: 1.15, weight: 500, tracking: '-0.02em' },
    h1: { size: 22, leading: 1.25, weight: 500, tracking: '-0.015em' },
    h2: { size: 15, leading: 1.3, weight: 600 },
    // A figure, not a heading: it stays bold, and tightens as theirs do.
    kpi: { size: 28, leading: 1, weight: 700, tracking: '-0.02em' },
    body: { size: 13, leading: 1.5, weight: 400 },
    label: { size: 10, leading: 1.2, weight: 700, tracking: '0.08em', transform: 'uppercase' },
    micro: { size: 9, leading: 1.2, weight: 400 },
  },
} as const;

export type TokenColor = keyof typeof tokens.color;

/**
 * Ink or surface, whichever is legible on `background`.
 *
 * The series ramp runs from navy to a very pale blue, and a label printed on it in white is
 * invisible by the fourth step — R-23's funnel put white text on `#D3E0EC`, which is 1.2:1.
 * Choosing by measured luminance means a mark can be given any ramp colour without someone
 * having to remember which half of it they are on.
 */
export function readableOn(background: string): string {
  const channels = [background.slice(1, 3), background.slice(3, 5), background.slice(5, 7)].map(
    (pair) => {
      const value = parseInt(pair, 16) / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    },
  );
  const luminance =
    0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
  const onWhite = 1.05 / (luminance + 0.05);
  const onInk = (luminance + 0.05) / 0.0722;
  return onWhite >= onInk ? tokens.color.surface : tokens.color.ink;
}

/** Series colour by index, wrapping round the ramp. */
export function seriesColor(index: number): string {
  const ramp = tokens.series;
  return ramp[index % ramp.length] ?? ramp[0];
}

/**
 * Chart-specific colours, so a chart never reaches for a raw hex.
 * Good/bad colouring is only ever applied where there is a real threshold (PRD §8).
 */
export const chart = {
  grid: tokens.color.line,
  axis: tokens.color.muted,
  primary: tokens.color.navy,
  secondary: tokens.color.cyan,
  /** Targets and appetite bands are dashed, never solid. */
  target: tokens.color.muted,
  /** Regulatory floors are red, dashed and always labelled. */
  floor: tokens.color.negative,
  band: tokens.color.line,
  positive: tokens.color.positive,
  warning: tokens.color.warning,
  negative: tokens.color.negative,
  /** Neutral fill for a bar with no threshold meaning. */
  neutral: tokens.series[4],
} as const;

/** System stack only — PRD §4 forbids webfont downloads. */
/*
 * Two faces, taken from rtb.iq and self-hosted.
 *
 * **Fira Sans** sets headings and figures, **Barlow** sets text and UI — which is exactly
 * how the bank's own site is built. Both are SIL OFL, and both ship as files in the bundle
 * rather than from a CDN, because PRD §4 forbids a network call at runtime and a webfont
 * request is a network call.
 *
 * **Tajawal** carries Arabic, again as the bank does. It is not decoration: a report can be
 * named in Arabic today, and the share link encodes UTF-8 bytes precisely so that works.
 * Its face is only fetched when an Arabic glyph is actually used, because it is loaded from
 * the Arabic subset alone and the browser matches on `unicode-range`.
 */
const SYSTEM = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Headings, figures, anything with a voice. */
export const DISPLAY_STACK = `"Fira Sans", Tajawal, ${SYSTEM}`;

/** Body, labels, tables, controls. */
export const TEXT_STACK = `Barlow, Tajawal, ${SYSTEM}`;

/** @deprecated Kept so nothing breaks mid-refactor; prefer TEXT_STACK. */
export const FONT_STACK = TEXT_STACK;
