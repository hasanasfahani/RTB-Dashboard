import { tokens } from '../../design/tokens.ts';
import type { ChartShape } from '../../types.ts';

/**
 * A 28x18 glyph of what a block will look like once it is on the page.
 *
 * Not a preview. A real one means building that block's data for every row in a list of
 * 163, which is a second's work per scroll and tells the reader nothing a silhouette does
 * not — at this size all anyone reads is the *form*: bars, a line, a ring, a map. That is
 * precisely the question they are asking, which is "will this sit next to the thing I
 * already put on the page".
 *
 * Fixed marks, deliberately. A glyph drawn from real data would move when the filters
 * moved, which would make the list flicker as somebody typed.
 */

const NAVY = tokens.color.navy;
const CYAN = tokens.color.cyan;
const MUTED = tokens.color.muted;

/** Height 18, width 28, baseline at y=15. Bars grow up from the baseline. */
function Bars({ heights, fill = NAVY }: { heights: readonly number[]; fill?: string }) {
  const width = 28 / heights.length;
  return (
    <>
      {heights.map((height, index) => (
        <rect
          key={index}
          x={index * width + width * 0.18}
          y={15 - height}
          width={width * 0.64}
          height={height}
          fill={fill}
        />
      ))}
    </>
  );
}

const GLYPHS: Readonly<Record<ChartShape, React.ReactNode>> = {
  kpiSet: (
    <>
      {[0, 1, 2].map((index) => (
        <g key={index}>
          <rect x={index * 9.8} y={4} width={7.6} height={2.4} fill={NAVY} />
          <rect x={index * 9.8} y={8} width={5.2} height={1.4} fill={MUTED} />
        </g>
      ))}
    </>
  ),
  timeSeries: (
    <polyline
      points="1,13 6,9 11,11 16,5 21,7 27,3"
      fill="none"
      stroke={NAVY}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  breakdown: (
    <>
      <circle cx={14} cy={9} r={6.4} fill="none" stroke={tokens.color.line} strokeWidth={3.2} />
      {/* A single arc: enough to read as a share of a whole. */}
      <path d="M14 2.6 A6.4 6.4 0 0 1 19.1 13" fill="none" stroke={CYAN} strokeWidth={3.2} />
    </>
  ),
  ranked: <Bars heights={[11, 8.5, 6.5, 5, 3.5]} />,
  matrix: (
    <>
      {[0, 1, 2, 3].map((column) =>
        [0, 1, 2].map((row) => (
          <rect
            key={`${column}-${row}`}
            x={column * 7 + 0.6}
            y={row * 4.6 + 2}
            width={5.8}
            height={3.4}
            // A read of a heatmap is the pattern, so the glyph has to have one.
            fill={(column + row) % 3 === 0 ? NAVY : (column + row) % 3 === 1 ? CYAN : tokens.color.line}
          />
        )),
      )}
    </>
  ),
  funnelSteps: (
    <>
      {[0, 1, 2].map((index) => (
        <rect
          key={index}
          x={index * 3.2 + 1}
          y={index * 4.4 + 2}
          width={26 - index * 6.4}
          height={3.4}
          fill={index === 0 ? NAVY : index === 1 ? CYAN : MUTED}
        />
      ))}
    </>
  ),
  distribution: <Bars heights={[3, 6, 10, 12, 8, 4]} />,
  flows: (
    <>
      <rect x={1} y={3} width={2.6} height={11} fill={NAVY} />
      <rect x={24.4} y={3} width={2.6} height={4.4} fill={CYAN} />
      <rect x={24.4} y={9.6} width={2.6} height={4.4} fill={MUTED} />
      <path d="M3.6 6 C14 6 14 5.2 24.4 5.2" fill="none" stroke={CYAN} strokeWidth={2.2} opacity={0.55} />
      <path d="M3.6 11.4 C14 11.4 14 11.8 24.4 11.8" fill="none" stroke={MUTED} strokeWidth={2.2} opacity={0.55} />
    </>
  ),
  scatterPoints: (
    <>
      {[
        [3, 12], [7, 9], [10, 11], [13, 6], [17, 8], [20, 4], [24, 6],
      ].map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r={1.5} fill={index % 3 === 0 ? CYAN : NAVY} />
      ))}
    </>
  ),
  gaugeSet: (
    <>
      {[7, 21].map((cx, index) => (
        <g key={cx}>
          <path
            d={`M${cx - 5.4} 12 A5.4 5.4 0 0 1 ${cx + 5.4} 12`}
            fill="none"
            stroke={tokens.color.line}
            strokeWidth={2.4}
          />
          <path
            d={index === 0 ? `M${cx - 5.4} 12 A5.4 5.4 0 0 1 ${cx + 1.2} 7.2` : `M${cx - 5.4} 12 A5.4 5.4 0 0 1 ${cx + 4.6} 9.4`}
            fill="none"
            stroke={index === 0 ? CYAN : NAVY}
            strokeWidth={2.4}
          />
        </g>
      ))}
    </>
  ),
  bulletRows: (
    <>
      {[0, 1, 2].map((index) => (
        <g key={index}>
          <rect x={1} y={index * 5 + 3} width={26} height={3} fill={tokens.color.line} />
          <rect x={1} y={index * 5 + 3} width={[19, 12, 23][index]} height={3} fill={NAVY} />
          {/* The target tick, which is what makes a bullet a bullet. */}
          <rect x={[21, 17, 20][index]} y={index * 5 + 2.2} width={1.2} height={4.6} fill={MUTED} />
        </g>
      ))}
    </>
  ),
  tableRows: (
    <>
      {[0, 1, 2, 3].map((index) => (
        <g key={index}>
          <rect x={1} y={index * 4.2 + 2} width={11} height={2} fill={index === 0 ? NAVY : MUTED} />
          <rect x={14} y={index * 4.2 + 2} width={6} height={2} fill={index === 0 ? NAVY : tokens.color.line} />
          <rect x={21} y={index * 4.2 + 2} width={6} height={2} fill={index === 0 ? NAVY : tokens.color.line} />
        </g>
      ))}
    </>
  ),
  waterfallSteps: (
    <>
      <rect x={1} y={7} width={4} height={8} fill={NAVY} />
      <rect x={6.8} y={4.6} width={4} height={2.4} fill={CYAN} />
      <rect x={12.6} y={4.6} width={4} height={2.4} fill={MUTED} />
      <rect x={18.4} y={7} width={4} height={2.4} fill={MUTED} />
      <rect x={23} y={9.4} width={4} height={5.6} fill={NAVY} />
    </>
  ),
  geoPoints: (
    <>
      {/* An outline that reads as territory rather than any particular country. */}
      <path
        d="M4 4 L11 2.4 L19 4.4 L25 3 L26 10 L21 15 L12 15.6 L5 13 Z"
        fill={tokens.color.line}
        stroke={MUTED}
        strokeWidth={0.7}
      />
      <circle cx={10} cy={8} r={2.2} fill={NAVY} />
      <circle cx={18} cy={7} r={1.5} fill={CYAN} />
      <circle cx={21} cy={11.6} r={1} fill={CYAN} />
    </>
  ),
  scenarioSet: (
    <>
      {[0, 1, 2].map((index) => (
        <rect
          key={index}
          x={index * 9.8 + 1.4}
          y={15 - [7, 10.5, 5][index]!}
          width={6.6}
          height={[7, 10.5, 5][index]}
          fill={[MUTED, NAVY, CYAN][index]}
        />
      ))}
    </>
  ),
};

/** Shape names as a reader would say them, for the row's second line and the tooltip. */
export const SHAPE_LABEL: Readonly<Record<ChartShape, string>> = {
  kpiSet: 'Figures',
  timeSeries: 'Over time',
  breakdown: 'Share of a whole',
  ranked: 'Ranked',
  matrix: 'Grid',
  funnelSteps: 'Funnel',
  distribution: 'Distribution',
  flows: 'Flows',
  scatterPoints: 'Scatter',
  gaugeSet: 'Dials',
  bulletRows: 'Against target',
  tableRows: 'Table',
  waterfallSteps: 'Bridge',
  geoPoints: 'Map',
  scenarioSet: 'Scenarios',
};

export function ShapeGlyph({ shape }: { shape: ChartShape }) {
  return (
    <svg
      width={28}
      height={18}
      viewBox="0 0 28 18"
      className="shrink-0"
      role="img"
      aria-label={SHAPE_LABEL[shape]}
    >
      {GLYPHS[shape]}
    </svg>
  );
}
