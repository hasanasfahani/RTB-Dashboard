import type { ChartProps } from './contract.ts';
import { resolveHeight } from './contract.ts';
import type { ScenarioData } from '../../types.ts';
import { chart, tokens } from '../../design/tokens.ts';
import { formatDelta, formatValue } from '../../design/format.ts';
import { ChartFrame, ChartNote, DASH_TARGET } from './common.tsx';

/**
 * Hand-rolled (PRD §4). Variants: `scenarios`, `tornado`.
 *
 * `scenarios` shows each stress case against the base with the base as a dashed
 * reference. `tornado` ranks drivers by the width of their swing, which is the point:
 * the widest bar is the thing worth hedging.
 */
export function ScenarioBars(props: ChartProps) {
  const scenarios = props.data.shape === 'scenarioSet' ? (props.data as ScenarioData) : undefined;
  const resolved = resolveHeight({ height: props.height, compact: props.compact });

  if (!scenarios || scenarios.scenarios.length === 0) {
    return <ChartFrame height={resolved} isEmpty label="Scenario bars">{null}</ChartFrame>;
  }
  return scenarios.mode === 'tornado' ? (
    <Tornado data={scenarios} height={resolved} compact={props.compact ?? false} />
  ) : (
    <Scenarios data={scenarios} height={resolved} compact={props.compact ?? false} />
  );
}

function Scenarios({ data, height, compact }: { data: ScenarioData; height: number; compact: boolean }) {
  const values = data.scenarios.map((scenario) => scenario.value);
  const max = Math.max(...values, data.baseline);
  const min = Math.min(...values, data.baseline, 0);
  const span = max - min || 1;
  const pct = (value: number): number => ((value - min) / span) * 100;

  return (
    <>
      <div className="flex flex-col justify-center gap-2" style={{ minHeight: height }}>
        {data.scenarios.map((scenario) => {
          const isBase = scenario.delta === 0;
          return (
            <div key={scenario.key}>
              <div className="mb-0.5 flex items-baseline justify-between gap-2">
                <span className="text-micro text-muted">{scenario.label}</span>
                <span className="text-micro">
                  <span className="font-bold text-navy">
                    {formatValue(scenario.value, data.unit, { compact: true })}
                  </span>
                  {!isBase && (
                    <span className={`ms-1.5 ${scenario.delta < 0 ? 'text-warningInk' : 'text-positiveInk'}`}>
                      {formatDelta((scenario.delta / (data.baseline || 1)) * 100)}
                    </span>
                  )}
                </span>
              </div>
              <div className="relative h-3 rounded-chip bg-line">
                <div
                  className="absolute inset-y-0 start-0 rounded-chip"
                  style={{
                    width: `${pct(scenario.value)}%`,
                    // The base case is the anchor, so it takes the primary colour and
                    // the stressed cases sit in the secondary ramp.
                    backgroundColor: isBase ? tokens.color.navy : tokens.series[2],
                  }}
                />
              </div>
            </div>
          );
        })}
        {/* Base case reference — dashed, never solid (PRD §8). */}
        <div className="relative h-0">
          <svg width="100%" height="1" className="overflow-visible">
            <line
              x1={`${pct(data.baseline)}%`}
              x2={`${pct(data.baseline)}%`}
              y1={compact ? -60 : -110}
              y2={4}
              stroke={chart.target}
              strokeDasharray={DASH_TARGET}
            />
          </svg>
        </div>
      </div>
      <ChartNote note={data.note} />
    </>
  );
}

function Tornado({ data, height, compact }: { data: ScenarioData; height: number; compact: boolean }) {
  const lows = data.scenarios.map((scenario) => scenario.low ?? data.baseline);
  const highs = data.scenarios.map((scenario) => scenario.high ?? data.baseline);
  const min = Math.min(...lows, data.baseline);
  const max = Math.max(...highs, data.baseline);
  const span = max - min || 1;
  const pct = (value: number): number => ((value - min) / span) * 100;
  const centre = pct(data.baseline);

  return (
    <>
      <div className="relative flex flex-col justify-center gap-2" style={{ minHeight: height }}>
        {data.scenarios.map((scenario) => {
          const low = pct(scenario.low ?? data.baseline);
          const high = pct(scenario.high ?? data.baseline);
          return (
            <div key={scenario.key} className="grid grid-cols-[96px_1fr] items-center gap-2">
              <span className="truncate text-micro text-muted" title={scenario.label}>
                {scenario.label}
              </span>
              <div className="relative h-4">
                <div
                  className="absolute inset-y-0 rounded-chip"
                  style={{ left: `${low}%`, width: `${Math.max(1, centre - low)}%`, backgroundColor: tokens.color.warning }}
                />
                <div
                  className="absolute inset-y-0 rounded-chip"
                  style={{ left: `${centre}%`, width: `${Math.max(1, high - centre)}%`, backgroundColor: tokens.color.cyan }}
                />
              </div>
            </div>
          );
        })}
        {/* The base case runs down the middle of a tornado. */}
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `calc(96px + 8px + ${centre}% * 0.999)` }}>
          <div className="h-full border-s border-dashed border-muted" />
        </div>
      </div>
      {!compact && (
        <p className="mt-1 text-micro text-muted">
          Base {formatValue(data.baseline, data.unit, { compact: true })} · bars show downside and upside
        </p>
      )}
      <ChartNote note={data.note} />
    </>
  );
}
