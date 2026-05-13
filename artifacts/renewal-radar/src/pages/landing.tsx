import { useRef, useEffect, useState, useCallback } from "react";
import { RadarMark } from "@/components/risk-radar/Chrome";
import { BtnAmber, BtnGhost } from "@/components/risk-radar/Chrome";

/* ── Orbiting category labels (DOM elements, not canvas) ── */
interface OrbitalNode {
  label: string;
  count: string;
  color: string;
  rx: number;        // horizontal orbit radius (fraction of container)
  ry: number;        // vertical orbit radius (fraction of container)
  speed: number;    // radians per ms
  phase: number;     // starting angle (radians)
  direction: 1 | -1; // clockwise or counter-clockwise
  size: "lg" | "sm"; // visual size variant
}

const ORBITAL_NODES: OrbitalNode[] = [
  { label: "CONTRACTS",    count: "12 Expiring", color: "#FF6B35", rx: 0.18, ry: 0.14, speed: 0.00028, phase: 0.0,           direction: 1,  size: "lg" },
  { label: "PERMITS",      count: "5 Expiring",   color: "#F5A623", rx: 0.22, ry: 0.18, speed: 0.00022, phase: Math.PI * 0.33, direction: -1, size: "lg" },
  { label: "INSURANCE",    count: "3 Renewals",   color: "#00C8F0", rx: 0.26, ry: 0.22, speed: 0.00018, phase: Math.PI * 0.67, direction: 1,  size: "lg" },
  { label: "COMPLIANCE",   count: "2 Overdue",    color: "#00E676", rx: 0.30, ry: 0.25, speed: 0.00015, phase: Math.PI * 1.0,  direction: -1, size: "lg" },
  { label: "DEADLINES",    count: "9 Due Soon",   color: "#F5A623", rx: 0.15, ry: 0.11, speed: 0.00032, phase: Math.PI * 1.33, direction: 1,  size: "sm" },
  { label: "EXPOSURE",     count: "7 High Risk",  color: "#FF4040", rx: 0.34, ry: 0.28, speed: 0.00012, phase: Math.PI * 1.67, direction: -1, size: "sm" },
];

function OrbitingLabels() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const anglesRef = useRef<number[]>(ORBITAL_NODES.map((n) => n.phase));
  const rafRef = useRef<number>(0);

  const setNodeRef = useCallback((idx: number, el: HTMLDivElement | null) => {
    nodeRefs.current[idx] = el;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let last = 0;
    const tick = (t: number) => {
      if (!last) last = t;
      const dt = t - last;
      last = t;

      const W = container.offsetWidth;
      const H = container.offsetHeight;
      const cx = W * 0.64;  // orbit center matches radar center
      const cy = H * 0.5;

      ORBITAL_NODES.forEach((node, i) => {
        anglesRef.current[i] += node.speed * node.direction * dt;
        const angle = anglesRef.current[i];
        const x = cx + Math.cos(angle) * node.rx * W;
        const y = cy + Math.sin(angle) * node.ry * H;

        const el = nodeRefs.current[i];
        if (el) {
          el.style.transform = `translate(${x}px, ${y}px)`;
        }
      });

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
    >
      {ORBITAL_NODES.map((node, i) => (
        <div
          key={node.label}
          ref={(el) => setNodeRef(i, el)}
          className="absolute top-0 left-0 pointer-events-auto"
          style={{
            willChange: "transform",
            translate: "-50% -50%",
          }}
        >
          <div
            style={{
              background: "rgba(10,14,24,.88)",
              border: `1px solid ${node.color}44`,
              borderRadius: node.size === "lg" ? 10 : 7,
              padding: node.size === "lg" ? "8px 14px" : "6px 10px",
              boxShadow: `0 0 20px ${node.color}15, 0 4px 12px rgba(0,0,0,.5)`,
              backdropFilter: "blur(8px)",
              animation: `stagger-in .5s ease both`,
              animationDelay: `${i * 0.08}s`,
            }}
          >
            {/* Live dot */}
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="w-[5px] h-[5px] rounded-full inline-block"
                style={{
                  background: node.color,
                  boxShadow: `0 0 8px ${node.color}55`,
                  animation: "pulse-led 2s ease-in-out infinite",
                }}
              />
              <span
                className="font-bold uppercase tracking-[0.12em]"
                style={{
                  color: node.color,
                  fontSize: node.size === "lg" ? "10.5px" : "9px",
                }}
              >
                {node.label}
              </span>
            </div>
            {node.size === "lg" && (
              <div
                className="text-[12px] font-semibold pl-[13px]"
                style={{ color: "#8898A8" }}
              >
                {node.count}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Hero canvas overlay with particles + sweep ── */
function HeroOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sweep = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Particles
    const N = 80;
    const particles = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.00012,
      vy: (Math.random() - 0.5) * 0.00012,
      alpha: Math.random() * 0.7 + 0.15,
      color:
        Math.random() > 0.6 ? "#F5A623" : Math.random() > 0.5 ? "#00C8F0" : "#FFFFFF",
    }));

    let last = 0;
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Radar sweep
      sweep.current = (sweep.current + dt * 0.018) % 360;
      const sweepRad = (sweep.current - 90) * (Math.PI / 180);
      const cx = W * 0.64;
      const cy = H * 0.5;
      const R = H * 0.52;
      const coneWidth = (55 * Math.PI) / 180;

      ctx.save();
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      grad.addColorStop(0, "rgba(245,166,35,.18)");
      grad.addColorStop(0.6, "rgba(245,166,35,.06)");
      grad.addColorStop(1, "rgba(245,166,35,0)");
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, sweepRad, sweepRad + coneWidth);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepRad) * R, cy + Math.sin(sweepRad) * R);
      ctx.strokeStyle = "rgba(245,166,35,.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Concentric ring ghosts (matches orbital orbits)
      [0.18, 0.22, 0.26, 0.30, 0.15, 0.34].forEach((rx, i) => {
        const ry = [0.14, 0.18, 0.22, 0.25, 0.11, 0.28][i];
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * W, ry * H, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,.025)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Particles
      particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;
        const px = p.x * W;
        const py = p.y * H;
        const flicker = 0.7 + 0.3 * Math.sin(t * 0.003 + px);
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * flicker;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}

/* ── Category definitions ── */
const CATEGORIES = [
  { label: "CONTRACTS", count: "12 Expiring", color: "#FF6B35", desc: "Auto-renew windows, notice periods, term expiry." },
  { label: "PERMITS", count: "5 Expiring", color: "#F5A623", desc: "Operating permits, building, health, fire inspections." },
  { label: "INSURANCE", count: "3 Renewals", color: "#00C8F0", desc: "Policy renewals, coverage gaps, binding deadlines." },
  { label: "COMPLIANCE", count: "2 Overdue", color: "#00E676", desc: "Regulatory filings, certifications, audits." },
  { label: "DEADLINES", count: "9 Due Soon", color: "#F5A623", desc: "License renewals, vendor SLAs, payment obligations." },
  { label: "EXPOSURE", count: "7 High Risk", color: "#FF4040", desc: "Unowned risks, missing reminders, notice windows." },
];

const STEPS = [
  { n: "01", label: "Detect", desc: "DueRadar surfaces what's approaching before it's an emergency.", color: "#F5A623" },
  { n: "02", label: "Assign", desc: "Every risk gets an owner. Every owner gets a reminder schedule.", color: "#00C8F0" },
  { n: "03", label: "Act", desc: "One-click resolution paths. Upload proof, assign backup, set escalation.", color: "#00E676" },
  { n: "04", label: "Protect", desc: "Cleared risks become Protected. Coverage rises. Stress falls.", color: "#00E676" },
];

export default function LandingPage({ onEnter }: { onEnter?: () => void }) {
  return (
    <div className="min-h-screen overflow-y-auto overflow-x-hidden" style={{ background: "#050709" }}>
      {/* Hero section */}
      <div className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 opacity-92"
          style={{
            backgroundImage: "url('/hero.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, rgba(5,7,9,.96) 36%, rgba(5,7,9,.5) 58%, rgba(5,7,9,.2) 100%)",
          }}
        />
        <HeroOverlay />
        <OrbitingLabels />

        <div className="relative z-[2] px-20 py-20 max-w-[640px]">
          <div className="flex items-center gap-3.5 mb-8">
            <RadarMark size={48} />
          </div>
          <h1 className="text-[68px] font-bold tracking-[-0.04em] leading-none mb-0">
            Due<span className="text-[#F5A623]">Radar</span>
          </h1>
          <p className="text-[22px] font-medium text-[#8898A8] mt-4 mb-3 tracking-[-0.01em]">
            Your business deadline warning system.
          </p>
          <p className="text-[15px] text-[#4A5568] mb-9 leading-relaxed max-w-[500px]">
            Track contracts, permits, insurance, compliance dates, renewals, and operational
            exposure before they become expensive problems.
          </p>
          <div className="flex gap-3 flex-wrap">
            <BtnAmber onClick={onEnter}>Open Command Center →</BtnAmber>
            <BtnGhost>View Due Register</BtnGhost>
          </div>
        </div>
      </div>

      {/* What DueRadar Tracks */}
      <section className="py-20 px-20" style={{ background: "#0A0E18", borderTop: "1px solid rgba(255,255,255,.07)" }}>
        <div className="max-w-[960px] mx-auto">
          <div className="text-[11px] font-bold text-[#F5A623] uppercase tracking-[0.2em] mb-3.5">
            What DueRadar Tracks
          </div>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-12 max-w-[600px] leading-[1.1]">
            Every business deadline. One warning system.
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {CATEGORIES.map((c, i) => (
              <div
                key={i}
                className="py-6 px-6"
                style={{
                  background: "#0F1524",
                  border: "1px solid rgba(255,255,255,.07)",
                  borderRadius: 14,
                  borderLeft: `3px solid ${c.color}`,
                  animation: `stagger-in .4s ease both`,
                  animationDelay: `${i * 0.06}s`,
                }}
              >
                <div
                  className="w-[38px] h-[38px] rounded-full grid place-items-center mb-3.5"
                  style={{
                    background: `${c.color}18`,
                    border: `1.5px solid ${c.color}55`,
                  }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                </div>
                <div className="text-[14px] font-bold text-[#F0F4F8] mb-1">{c.label}</div>
                <div className="text-[14px] font-bold mb-2" style={{ color: c.color }}>
                  {c.count}
                </div>
                <div className="text-[13px] text-[#4A5568] leading-relaxed">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Command Loop */}
      <section className="py-20 px-20" style={{ background: "#050709" }}>
        <div className="max-w-[960px] mx-auto">
          <div className="text-[11px] font-bold text-[#00C8F0] uppercase tracking-[0.2em] mb-3.5">
            Daily Command Loop
          </div>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-12 max-w-[520px] leading-[1.1]">
            Four steps to a protected business.
          </h2>
          <div className="grid grid-cols-4 gap-0.5">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className="py-6 px-5"
                style={{
                  background: "#0A0E18",
                  border: "1px solid rgba(255,255,255,.07)",
                  borderRadius: 12,
                  borderTop: `3px solid ${s.color}`,
                }}
              >
                <div
                  className="text-[32px] font-bold tracking-[-0.04em] mb-3"
                  style={{ color: s.color, fontVariantNumeric: "tabular-nums" }}
                >
                  {s.n}
                </div>
                <div className="text-[15px] font-bold mb-2">{s.label}</div>
                <div className="text-[13px] text-[#4A5568] leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="py-20 px-20 text-center"
        style={{
          background: "linear-gradient(135deg, #0A0E18 0%, #0F1524 100%)",
          borderTop: "1px solid rgba(245,166,35,.2)",
        }}
      >
        <div className="max-w-[560px] mx-auto">
          <RadarMark size={56} />
          <h2 className="text-[44px] font-bold tracking-[-0.04em] mt-5 mb-3.5">
            Due<span className="text-[#F5A623]">Radar</span>
          </h2>
          <p className="text-[17px] text-[#8898A8] mb-9 leading-relaxed">
            Your business has deadlines that can cost you money, compliance, or leverage. DueRadar
            shows the most dangerous one first.
          </p>
          <BtnAmber onClick={onEnter}>Open Command Center →</BtnAmber>
        </div>
      </section>
    </div>
  );
}
