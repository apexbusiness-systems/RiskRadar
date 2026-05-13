import { useState, useEffect, useRef, useCallback } from "react";

/* ── Category definitions ── */
const CATEGORIES = [
  { id: "contracts", label: "CONTRACTS", sub: "12 expiring", color: "#FF6B35", angle: 38, r: 0.76, icon: "📄" },
  { id: "permits", label: "PERMITS", sub: "5 expiring", color: "#F5A623", angle: 315, r: 0.57, icon: "🏛" },
  { id: "insurance", label: "INSURANCE", sub: "3 renewals", color: "#00C8F0", angle: 355, r: 0.85, icon: "🛡" },
  { id: "compliance", label: "COMPLIANCE", sub: "2 overdue", color: "#00E676", angle: 308, r: 0.70, icon: "✓" },
  { id: "deadlines", label: "DEADLINES", sub: "9 due soon", color: "#F5A623", angle: 226, r: 0.60, icon: "📅" },
  { id: "exposure", label: "EXPOSURE", sub: "7 high risk", color: "#FF4040", angle: 250, r: 0.46, icon: "⚠" },
];

const CRITICAL_BLIPS = [
  { days: 4, angle: 298, label: "G/L Insurance" },
  { days: 6, angle: 24, label: "SOC 2" },
  { days: 11, angle: 68, label: "Anvil MSA" },
  { days: 19, angle: 112, label: "Liquor Lic." },
  { days: 23, angle: 160, label: "Workers Comp" },
];

function daysToR(d: number, max: number): number {
  if (d <= 0) return 0.04 * max;
  if (d <= 7) return (0.10 + (d / 7) * 0.22) * max;
  if (d <= 30) return (0.32 + ((d - 7) / 23) * 0.24) * max;
  if (d <= 90) return (0.56 + ((d - 30) / 60) * 0.24) * max;
  return Math.min(0.92, 0.80 + ((d - 90) / 90) * 0.12) * max;
}

interface OrbitalRadarProps {
  size?: number;
  onNodeClick?: (cat: typeof CATEGORIES[number]) => void;
}

export function OrbitalRadar({ size = 500, onNodeClick }: OrbitalRadarProps) {
  const [sweep, setSweep] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const raf = useRef<number | null>(null);
  const lastT = useRef<number | null>(null);

  useEffect(() => {
    const tick = (t: number) => {
      if (lastT.current) {
        const dt = t - lastT.current;
        setSweep((s) => (s + (dt / 10000) * 360) % 360);
      }
      lastT.current = t;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 16;
  const rings = [0.28, 0.45, 0.62, 0.80, 0.96];

  const toXY = useCallback(
    (angleDeg: number, radius: number) => {
      const rad = (angleDeg - 90) * (Math.PI / 180);
      return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius };
    },
    [cx, cy]
  );

  const sweepAngle = 50;
  const sweepRad1 = (sweep - 90) * (Math.PI / 180);
  const sweepRad2 = (sweep + sweepAngle - 90) * (Math.PI / 180);
  const sx1 = cx + Math.cos(sweepRad1) * R;
  const sy1 = cy + Math.sin(sweepRad1) * R;
  const sx2 = cx + Math.cos(sweepRad2) * R;
  const sy2 = cy + Math.sin(sweepRad2) * R;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <defs>
        <radialGradient id="rg-bg" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(245,166,35,.04)" />
          <stop offset="60%" stopColor="rgba(0,200,240,.03)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id="rg-center" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(245,166,35,.6)" />
          <stop offset="100%" stopColor="rgba(245,166,35,0)" />
        </radialGradient>
        <radialGradient id="rg-sweep" cx="0%" cy="50%" r="100%">
          <stop offset="0%" stopColor="rgba(245,166,35,.35)" />
          <stop offset="100%" stopColor="rgba(245,166,35,0)" />
        </radialGradient>
        <filter id="glow-amber">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-cyan">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* BG wash */}
      <circle cx={cx} cy={cy} r={R} fill="url(#rg-bg)" />

      {/* Orbital rings */}
      {rings.map((f, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={f * R}
          fill="none"
          stroke={i === 2 ? "rgba(0,200,240,.22)" : "rgba(0,200,240,.1)"}
          strokeWidth={i === 2 ? "1.2" : "0.8"}
          strokeDasharray={i === rings.length - 1 ? "3 5" : "0"}
        />
      ))}

      {/* Cross-hairs */}
      <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="rgba(0,200,240,.07)" strokeWidth=".8" />
      <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="rgba(0,200,240,.07)" strokeWidth=".8" />

      {/* Sweep cone */}
      <path
        d={`M ${cx} ${cy} L ${sx1} ${sy1} A ${R} ${R} 0 0 1 ${sx2} ${sy2} Z`}
        fill="url(#rg-sweep)"
      />
      <line
        x1={cx}
        y1={cy}
        x2={cx + Math.cos(sweepRad1) * R}
        y2={cy + Math.sin(sweepRad1) * R}
        stroke="rgba(245,166,35,.7)"
        strokeWidth="1.5"
        filter="url(#glow-amber)"
      />

      {/* Critical blips */}
      {CRITICAL_BLIPS.map((b, i) => {
        const rad = daysToR(b.days, R);
        const p = toXY(b.angle, rad);
        const blipColor = b.days <= 7 ? "#FF4040" : b.days <= 30 ? "#FF8C00" : "#F5A623";
        return (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill={blipColor}
              filter="url(#glow-amber)"
              style={{
                animation: `node-pulse ${1.5 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
            <circle cx={p.x} cy={p.y} r="8" fill="none" stroke={blipColor} strokeWidth="1" opacity=".4" />
          </g>
        );
      })}

      {/* Category nodes */}
      {CATEGORIES.map((cat, i) => {
        const pos = toXY(cat.angle, cat.r * R);
        const isHov = hovered === cat.id;
        const labelDist = 28;
        const lRad = (cat.angle - 90) * (Math.PI / 180);
        const lx = pos.x + Math.cos(lRad) * labelDist;
        const ly = pos.y + Math.sin(lRad) * labelDist;
        const labelAnchor =
          Math.cos(lRad) > 0.1 ? "start" : Math.cos(lRad) < -0.1 ? "end" : "middle";

        return (
          <g
            key={i}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHovered(cat.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onNodeClick?.(cat)}
          >
            {/* Connector line */}
            <line
              x1={cx + Math.cos(lRad) * (cat.r * R - 14)}
              y1={cy + Math.sin(lRad) * (cat.r * R - 14)}
              x2={pos.x}
              y2={pos.y}
              stroke={cat.color}
              strokeWidth=".8"
              opacity=".4"
            />
            {/* Outer ring */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isHov ? 16 : 13}
              fill="none"
              stroke={cat.color}
              strokeWidth="1.2"
              opacity={isHov ? ".9" : ".5"}
            />
            {/* Node fill */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isHov ? 10 : 8}
              fill={`${cat.color}25`}
              stroke={cat.color}
              strokeWidth="1"
              style={{
                animation: `orbit-glow ${2 + i * 0.2}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
            {/* Center dot */}
            <circle cx={pos.x} cy={pos.y} r="3" fill={cat.color} filter="url(#glow-amber)" />

            {/* Label */}
            <text
              x={lx}
              y={ly - 6}
              textAnchor={labelAnchor}
              fill={cat.color}
              fontSize="9.5"
              fontWeight="700"
              fontFamily="Space Grotesk, sans-serif"
              letterSpacing=".1em"
            >
              {cat.label}
            </text>
            <text
              x={lx}
              y={ly + 7}
              textAnchor={labelAnchor}
              fill="rgba(255,255,255,.5)"
              fontSize="9"
              fontFamily="Space Grotesk, sans-serif"
            >
              {cat.sub}
            </text>

            {/* Hover tooltip */}
            {isHov && (
              <g>
                <rect
                  x={pos.x - 60}
                  y={pos.y + 14}
                  width="120"
                  height="38"
                  rx="6"
                  fill="rgba(10,14,24,.95)"
                  stroke={cat.color}
                  strokeWidth=".8"
                />
                <text
                  x={pos.x}
                  y={pos.y + 30}
                  textAnchor="middle"
                  fill={cat.color}
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="Space Grotesk, sans-serif"
                >
                  {cat.sub}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 44}
                  textAnchor="middle"
                  fill="rgba(255,255,255,.5)"
                  fontSize="9"
                  fontFamily="Space Grotesk, sans-serif"
                >
                  Click to view →
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Center origin */}
      <circle cx={cx} cy={cy} r="3" fill="#F5A623" filter="url(#glow-amber)" />
      <circle cx={cx} cy={cy} r="8" fill="none" stroke="rgba(245,166,35,.5)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="14" fill="none" stroke="rgba(245,166,35,.25)" strokeWidth="1" />

      {/* Ring labels */}
      {[
        { r: 0.28, label: "7d" },
        { r: 0.45, label: "30d" },
        { r: 0.62, label: "90d" },
        { r: 0.80, label: "180d" },
      ].map((l, i) => (
        <text
          key={i}
          x={cx + l.r * R + 4}
          y={cy - 3}
          fill="rgba(0,200,240,.35)"
          fontSize="9"
          fontFamily="Space Grotesk, sans-serif"
          letterSpacing=".06em"
        >
          {l.label}
        </text>
      ))}
    </svg>
  );
}
