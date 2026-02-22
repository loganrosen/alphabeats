import { useState, useRef } from 'react';
import type { Inspection } from '../api.js';
import { fmtDate } from '../utils.js';
import GradeInfo from './GradeInfo.js';

const GRADE_COLOR: Record<string, string> = {
  A: '#15803d', B: '#d97706', C: '#dc2626',
};
// Z = grade pending (same as P in NYC system)
const GRADE_DISPLAY: Record<string, string> = { Z: 'P' };
const GRADE_TOOLTIP: Record<string, string> = { P: 'Pending', Z: 'Pending' };

interface Props {
  inspections: Inspection[];
  onSelect?: (date: string) => void;
}

export default function GradeTimeline({ inspections, onSelect }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pts = inspections
    .filter(i => i.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

  if (pts.length < 2) return null;

  const scoredPts = pts.filter(i => i.score != null);
  const hasScores = scoredPts.length >= 2;

  // Layout
  const W = 600, H = 195;
  const PAD_LEFT = 52, PAD_RIGHT = 20, PAD_TOP = 16, PAD_BOTTOM = 42;
  const MARKER_R = 10;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const minDate = new Date(pts[0].date!).getTime();
  const maxDate = new Date(pts[pts.length - 1].date!).getTime();
  const dateRange = maxDate - minDate || 1;

  const maxScore = Math.max(...(hasScores ? scoredPts.map(i => i.score!) : []), 28);
  const scoreMax = Math.ceil(maxScore / 5) * 5;
  const scoreMin = 0;
  const scoreRange = scoreMax - scoreMin || 1;

  function xOf(i: Inspection) {
    return PAD_LEFT + ((new Date(i.date!).getTime() - minDate) / dateRange) * chartW;
  }
  function yOf(score: number) {
    // 0 at bottom, higher scores toward top
    return PAD_TOP + chartH - ((score - scoreMin) / scoreRange) * chartH;
  }

  // X-axis: year ticks
  const minYear = new Date(pts[0].date!).getFullYear();
  const maxYear = new Date(pts[pts.length - 1].date!).getFullYear();
  const yearTicks: number[] = [];
  for (let y = minYear; y <= maxYear; y++) yearTicks.push(y);
  // Thin out if too many
  const step = yearTicks.length > 10 ? Math.ceil(yearTicks.length / 8) : 1;
  const visibleYears = yearTicks.filter((_, i) => i % step === 0);

  function xOfYear(year: number) {
    const t = new Date(year, 0, 1).getTime();
    return PAD_LEFT + ((t - minDate) / dateRange) * chartW;
  }

  // Y-axis: score ticks
  const yTicks = [0, 13, 27, scoreMax].filter((v, i, a) => a.indexOf(v) === i && v <= scoreMax);

  // Paths
  const areaPath = scoredPts.length >= 2
    ? [`M ${xOf(scoredPts[0])} ${yOf(scoredPts[0].score!)}`,
       ...scoredPts.slice(1).map(i => `L ${xOf(i)} ${yOf(i.score!)}`),
       `L ${xOf(scoredPts[scoredPts.length - 1])} ${PAD_TOP + chartH}`,
       `L ${xOf(scoredPts[0])} ${PAD_TOP + chartH}`, 'Z'].join(' ')
    : null;
  const linePath = scoredPts.length >= 2
    ? [`M ${xOf(scoredPts[0])} ${yOf(scoredPts[0].score!)}`,
       ...scoredPts.slice(1).map(i => `L ${xOf(i)} ${yOf(i.score!)}`)].join(' ')
    : null;

  const hoveredInsp = hovered != null ? pts[hovered] : null;

  // Tooltip: position near the marker, clamped to container width
  function tooltipLeft(i: Inspection): string {
    const pct = (xOf(i) / W) * 100;
    return `${Math.min(Math.max(pct, 8), 82)}%`;
  }
  function tooltipTop(i: Inspection): number {
    const cy = i.score != null ? yOf(i.score) : PAD_TOP + chartH / 2;
    // Render below marker if in top 40% of chart, else above
    const svgHeightPx = containerRef.current?.querySelector('svg')?.getBoundingClientRect().height ?? H;
    const markerPct = cy / H;
    return markerPct < 0.4
      ? (cy / H) * svgHeightPx + MARKER_R + 6   // below
      : (cy / H) * svgHeightPx - MARKER_R - 6;  // above (subtract tooltip height via transform)
  }
  function tooltipTransform(i: Inspection): string {
    const cy = i.score != null ? yOf(i.score) : PAD_TOP + chartH / 2;
    return cy / H < 0.4 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
  }

  return (
    <div className="mb-8">
      <h2 className="font-mono text-xs tracking-widest text-zinc-400 dark:text-zinc-500 uppercase mb-3 flex items-center gap-2">
        <span>Grade history</span>
        <GradeInfo />
        <span className="normal-case tracking-normal text-zinc-400 dark:text-zinc-600 font-normal">· lower violation points = better</span>
      </h2>
      <div ref={containerRef} className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-visible relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full block"
          onMouseLeave={() => setHovered(null)}
        >
          {/* Grade bands */}
          {hasScores && (
            <>
              <rect x={PAD_LEFT} y={yOf(scoreMax)} width={chartW} height={yOf(27) - yOf(scoreMax)} fill="#dc2626" fillOpacity={0.04} />
              <rect x={PAD_LEFT} y={yOf(27)}      width={chartW} height={yOf(13) - yOf(27)}      fill="#d97706" fillOpacity={0.04} />
              <rect x={PAD_LEFT} y={yOf(13)}      width={chartW} height={yOf(0)  - yOf(13)}      fill="#15803d" fillOpacity={0.04} />
            </>
          )}

          {/* Y-axis line */}
          <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={PAD_TOP + chartH} stroke="currentColor" strokeWidth={0.5} opacity={0.2} className="text-zinc-500" />

          {/* X-axis line */}
          <line x1={PAD_LEFT} y1={PAD_TOP + chartH} x2={PAD_LEFT + chartW} y2={PAD_TOP + chartH} stroke="currentColor" strokeWidth={0.5} opacity={0.2} className="text-zinc-500" />

          {/* Y-axis ticks + labels */}
          {yTicks.map(score => {
            const y = yOf(score);
            const color = score === 13 ? '#15803d' : score === 27 ? '#d97706' : undefined;
            return (
              <g key={score}>
                <line x1={PAD_LEFT - 4} y1={y} x2={PAD_LEFT + chartW} y2={y}
                  stroke={color ?? 'currentColor'} strokeWidth={score === 0 ? 0 : 0.5}
                  strokeDasharray={score === 0 ? undefined : '3 3'}
                  opacity={color ? 0.4 : 0.15} className="text-zinc-500" />
                <text x={PAD_LEFT - 7} y={y + 4} textAnchor="end"
                  fontSize={11} fontFamily="monospace"
                  fill={color ?? '#71717a'} opacity={color ? 1 : 0.85}>
                  {score}
                </text>
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            x={8} y={PAD_TOP + chartH / 2}
            textAnchor="middle"
            fontSize={9} fontFamily="monospace"
            fill="#71717a" opacity={0.8}
            transform={`rotate(-90, 8, ${PAD_TOP + chartH / 2})`}
            letterSpacing="1"
          >
            VIOLATION PTS
          </text>

          {/* X-axis ticks + labels */}
          {visibleYears.map(year => {
            const x = xOfYear(year);
            if (x < PAD_LEFT || x > PAD_LEFT + chartW) return null;
            return (
              <g key={year}>
                <line x1={x} y1={PAD_TOP + chartH} x2={x} y2={PAD_TOP + chartH + 5}
                  stroke="currentColor" strokeWidth={0.75} opacity={0.4} className="text-zinc-500" />
                <text x={x} y={PAD_TOP + chartH + 16} textAnchor="middle"
                  fontSize={11} fontFamily="monospace" opacity={0.85}
                  fill="#71717a">
                  {year}
                </text>
              </g>
            );
          })}

          {/* Area + line */}
          {areaPath && <path d={areaPath} fill="#ca8a04" fillOpacity={0.08} />}
          {linePath  && <path d={linePath} fill="none" stroke="#ca8a04" strokeWidth={1.5} strokeLinejoin="round" opacity={0.5} />}

          {/* Hover crosshair */}
          {hoveredInsp && (
            <line x1={xOf(hoveredInsp)} y1={PAD_TOP} x2={xOf(hoveredInsp)} y2={PAD_TOP + chartH}
              stroke="#ca8a04" strokeWidth={1} opacity={0.35} />
          )}

          {/* Markers */}
          {pts.map((insp, i) => {
            const cx = xOf(insp);
            const cy = insp.score != null ? yOf(insp.score) : PAD_TOP + chartH / 2;
            const color = GRADE_COLOR[insp.grade ?? ''] ?? '#71717a';
            const isHov = hovered === i;
            const r = isHov ? MARKER_R + 2 : MARKER_R;
            const gradeLabel = GRADE_DISPLAY[insp.grade ?? ''] ?? insp.grade ?? '';
            return (
              <g key={i} onMouseEnter={() => setHovered(i)}
                onClick={() => insp.date && onSelect?.(insp.date)}
                style={{ cursor: 'pointer' }}>
                {insp.closed && (
                  <circle cx={cx} cy={cy} r={r + 3.5} fill="none" stroke="#ea580c" strokeWidth={1.5} opacity={0.8} />
                )}
                <circle cx={cx} cy={cy} r={r}
                  fill={color} opacity={isHov ? 1 : 0.85}
                  style={{ transition: 'r 0.1s' }} />
                {gradeLabel && (
                  <text x={cx} y={cy + 4.5} textAnchor="middle"
                    fontSize={12} fontWeight="700" fontFamily="'Bebas Neue', sans-serif" fill="white"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {gradeLabel}
                  </text>
                )}
                {insp.score != null && (
                  <text x={cx} y={cy + r + 11} textAnchor="middle"
                    fontSize={10} fontFamily="monospace" fill={color} opacity={0.9}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {insp.score}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip — rendered outside SVG, clamped */}
        {hoveredInsp && (() => {
          const critCount = hoveredInsp.violations.filter(v => v.critical).length;
          return (
            <div className="absolute pointer-events-none z-10"
              style={{ left: tooltipLeft(hoveredInsp), top: tooltipTop(hoveredInsp), transform: tooltipTransform(hoveredInsp) }}>
              <div className="bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded px-2.5 py-1.5 font-mono text-xs whitespace-nowrap shadow-lg">
                <div className="font-semibold">{fmtDate(hoveredInsp.date)}</div>
                {hoveredInsp.grade && (
                  <div style={{ color: GRADE_COLOR[hoveredInsp.grade] }}>
                    Grade {GRADE_TOOLTIP[hoveredInsp.grade] ?? GRADE_DISPLAY[hoveredInsp.grade] ?? hoveredInsp.grade}{hoveredInsp.score != null ? ` · ${hoveredInsp.score} pts` : ''}
                  </div>
                )}
                {critCount > 0 && <div className="text-red-400 dark:text-red-600">{critCount} critical violation{critCount !== 1 ? 's' : ''}</div>}
                {hoveredInsp.closed && <div className="text-orange-400 dark:text-orange-500">Closed by DOHMH</div>}
                {hoveredInsp.type && <div className="opacity-50 text-[10px] mt-0.5">{hoveredInsp.type}</div>}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

