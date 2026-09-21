import type { Config } from 'tailwindcss';
import { tokens, DISPLAY_STACK, TEXT_STACK } from './src/design/tokens.ts';

/**
 * A1 (plan §4): the theme is generated from `tokens.ts`, so `tokens.ts` is the only
 * place a colour is written down. `npm run verify:tokens` fails the build if a hex
 * appears anywhere else.
 */
/*
 * `tokens.space` is [4, 8, 12, 16, 24, 32, 48], which is exactly Tailwind's default
 * 4px scale at 1, 2, 3, 4, 6, 8 and 12 — so the default scale is the token scale and
 * adding aliases would only give two ways to write the same value. `verify:tokens`
 * asserts the mapping still holds.
 */
const fontSize = Object.fromEntries(
  Object.entries(tokens.type).map(([name, scale]) => [
    name,
    [
      `${scale.size}px`,
      {
        lineHeight: String(scale.leading),
        fontWeight: String(scale.weight),
        ...('tracking' in scale ? { letterSpacing: scale.tracking } : {}),
      },
    ],
  ]),
) as Config['theme'] extends { fontSize?: infer T } ? T : never;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...tokens.color,
        series: Object.fromEntries(tokens.series.map((hex, index) => [index + 1, hex])),
      },
      borderRadius: {
        card: `${tokens.radius.card}px`,
        chip: `${tokens.radius.chip}px`,
      },
      fontSize,
      fontFamily: { sans: [TEXT_STACK], display: [DISPLAY_STACK] },
    },
  },
  plugins: [],
} satisfies Config;
