import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { BulletData, BulletRow } from '../../types.ts';
import { chart, tokens } from '../../design/tokens.ts';
import { formatValue } from '../../design/format.ts';
import { ChartFrame, ChartNote } from './common.tsx';

/**
 * Hand-rolled SVG (PRD §4). Variant: `plain`.
 *
 * Several rows per panel — E-03 is ROE *and* ROA (plan §2.8). Qualitative ranges are
 * greys; the measure is navy; the target is a dashed marker, never solid.
 */
export function BulletChart({ data, height, compact = false }: ChartProps) {
  const bullets = data.shape === 'bulletRows' ? (data as BulletData) : undefined;
  const resolved = resolveHeight({ height, compact });

  if (!bullets || bullets.rows.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Bullet chart">{null}</ChartFrame>;
  }

  return (
    <>
      <div className="flex flex-col justify-center gap-3" style={{ minHeight: resolved }}>
        {bullets.rows.map((row) => (
          <Bullet key={row.key} row={row} unit={bullets.unit} compact={compact} />
        ))}
      </div>
      <ChartNote note={bullets.note} />
    </>
  );
}

function Bullet({
  row,
  unit,
  compact,
}: {
  row: BulletRow;
  unit: BulletData['unit'];
  compact: boolean;
}) {
  const ceiling = Math.max(row.ranges.at(-1) ?? row.value, row.value, row.target) || 1;
  const pct = (value: number): number => Math.min(100, Math.max(0, (value / ceiling) * 100));
  const barHeight = compact ? 10 : 14;

  // Ranges are ascending, so draw widest first and let the narrower ones sit on top.
  const bands = [...row.ranges].sort((a, b) => b - a);
  const shades = [tokens.series[5], tokens.series[4], tokens.series[3]];

  const meetsTarget = row.value >= row.target;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-label text-muted">{row.label}</span>
        <span className="text-micro">
          <span className="font-bold text-navy">{formatValue(row.value, unit, { compact: true })}</span>
          <span className="ms-1.5 text-muted">
            vs {formatValue(row.target, unit, { compact: true })}
          </span>
          {/* There is a real threshold here, so a good/bad read is legitimate. */}
          <span className={`ms-1.5 font-bold ${meetsTarget ? 'text-positiveInk' : 'text-warningInk'}`}>
            {meetsTarget ? 'on plan' : 'below'}
          </span>
        </span>
      </div>
      <svg width="100%" height={barHeight + 8} role="img" aria-label={`${row.label} ${formatValue(row.value, unit)} against target ${formatValue(row.target, unit)}`}>
        {bands.map((band, index) => (
          <rect
            key={band}
            x="0"
            y="4"
            width={`${pct(band)}%`}
            height={barHeight}
            fill={shades[index] ?? tokens.series[5]}
            rx="1"
          />
        ))}
        <rect x="0" y={4 + barHeight / 4} width={`${pct(row.value)}%`} height={barHeight / 2} fill={tokens.color.navy} rx="1" />
        <line
          x1={`${pct(row.target)}%`}
          x2={`${pct(row.target)}%`}
          y1="1"
          y2={barHeight + 7}
          stroke={chart.target}
          strokeWidth={2}
          strokeDasharray="3 2"
        />
      </svg>
    </div>
  );
}
