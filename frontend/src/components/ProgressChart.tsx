import { useRef, useState } from 'react';

export interface ProgressPoint {
  day: string;
  count: number;
}

// Chart ink — single sequential hue, with recessive axes/grid per the viz spec.
const BLUE = '#2a78d6';
const BLUE_HOVER = '#256abf';
const GRID = '#e1e0d9';
const AXIS = '#c3c2b7';
const MUTED = '#898781';
const SECONDARY = '#52514e';

const W = 600;
const H = 180;
const PAD_L = 36;
const PAD_R = 14;
const PAD_T = 12;
const PAD_B = 24;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function fmtDay(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** A rectangle with rounded top corners and a square baseline. */
function roundedTopBar(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

/**
 * A single-series SVG chart: bars for magnitude-per-day, or a line/area for a
 * cumulative trend. One y-axis, no dual scales; a crosshair + readout hover.
 */
export default function ProgressChart({
  data,
  kind,
  label,
}: {
  data: ProgressPoint[];
  kind: 'bar' | 'line';
  label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = data.length;
  if (n === 0) return null;

  const maxRaw = Math.max(...data.map((d) => d.count), 0);
  const max = Math.max(1, Math.ceil(maxRaw));
  const mid = Math.round(max / 2);
  const ticks = max >= 2 && mid > 0 && mid < max ? [0, mid, max] : [0, max];

  const slotW = PLOT_W / n;
  const barW = Math.min(slotW - 2, 24);
  const xAt = (i: number) => PAD_L + slotW * (i + 0.5);
  const yAt = (v: number) => PAD_T + PLOT_H * (1 - v / max);

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(d.count).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${xAt(n - 1).toFixed(1)},${PAD_T + PLOT_H} L${xAt(0).toFixed(1)},${PAD_T + PLOT_H} Z`;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fx = (e.clientX - rect.left) / rect.width;
    const plotFx = (fx - PAD_L / W) / (PLOT_W / W);
    const idx = kind === 'bar' ? Math.floor(plotFx * n) : Math.round(plotFx * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, idx)));
  };

  const hoverPoint = hover != null ? data[hover] : null;
  const hx = hover != null ? xAt(hover) : 0;
  const hy = hover != null ? yAt(data[hover].count) : 0;
  const tooltipLeft = Math.max(9, Math.min(91, (hx / W) * 100));

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={PAD_L + PLOT_W} y1={yAt(t)} y2={yAt(t)} stroke={GRID} strokeWidth={1} />
            <text x={PAD_L - 6} y={yAt(t) + 3} textAnchor="end" fontSize={10} fill={MUTED}>
              {t}
            </text>
          </g>
        ))}
        <line x1={PAD_L} x2={PAD_L + PLOT_W} y1={PAD_T + PLOT_H} y2={PAD_T + PLOT_H} stroke={AXIS} strokeWidth={1} />

        {kind === 'bar' ? (
          data.map((d, i) => {
            if (d.count <= 0) return null;
            const h = PAD_T + PLOT_H - yAt(d.count);
            const bx = PAD_L + slotW * i + (slotW - barW) / 2;
            return (
              <path
                key={i}
                d={roundedTopBar(bx, yAt(d.count), barW, h, 4)}
                fill={hover === i ? BLUE_HOVER : BLUE}
              />
            );
          })
        ) : (
          <>
            <path d={areaPath} fill={BLUE} opacity={0.1} />
            <path d={linePath} fill="none" stroke={BLUE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={xAt(n - 1)} cy={yAt(data[n - 1].count)} r={4} fill={BLUE} stroke="#ffffff" strokeWidth={2} />
            <text x={PAD_L + PLOT_W} y={yAt(data[n - 1].count) - 8} textAnchor="end" fontSize={11} fontWeight={600} fill={SECONDARY}>
              {data[n - 1].count}
            </text>
          </>
        )}

        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
          <text
            key={i}
            x={xAt(i)}
            y={H - 6}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            fontSize={10}
            fill={MUTED}
          >
            {fmtDay(data[i].day)}
          </text>
        ))}

        {hover != null && (
          <g>
            <line x1={hx} x2={hx} y1={PAD_T} y2={PAD_T + PLOT_H} stroke={AXIS} strokeWidth={1} />
            <circle cx={hx} cy={hy} r={4} fill={BLUE} stroke="#ffffff" strokeWidth={2} />
          </g>
        )}
      </svg>

      {hoverPoint && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white shadow"
          style={{ left: `${tooltipLeft}%` }}
        >
          <span className="font-semibold">{hoverPoint.count}</span> {label} · {fmtDay(hoverPoint.day)}
        </div>
      )}
    </div>
  );
}
