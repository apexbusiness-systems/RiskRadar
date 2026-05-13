import { useRef, useEffect, useState } from "react";
import { RadarMark } from "@/components/risk-radar/Chrome";
import { BtnAmber, BtnGhost } from "@/components/risk-radar/Chrome";

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

    // Category nodes for glow
    const nodes = [
      { x: 0.72, y: 0.18, color: "#FF6B35" },
      { x: 0.55, y: 0.26, color: "#F5A623" },
      { x: 0.88, y: 0.44, color: "#00C8F0" },
      { x: 0.84, y: 0.65, color: "#00E676" },
      { x: 0.46, y: 0.62, color: "#F5A623" },
      { x: 0.52, y: 0.78, color: "#FF4040" },
    ];

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

      // Node breathing glows
      nodes.forEach((n, i) => {
        const nx = n.x * W;
        const ny = n.y * H;
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.0018 + i * 1.1);
        const r = 6 + pulse * 4;
        const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, r * 3);
        grd.addColorStop(0, n.color + "55");
        grd.addColorStop(0.5, n.color + "22");
        grd.addColorStop(1, n.color + "00");
        ctx.beginPath();
        ctx.arc(nx, ny, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.globalAlpha = 0.6 + pulse * 0.4;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(nx, ny, 3 + pulse * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 0.7 + pulse * 0.3;
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
            <BtnGhost>View Risk Register</BtnGhost>
          </div>
          <div className="flex gap-5 flex-wrap mt-8 pt-7 border-t border-[rgba(255,255,255,.07)]">
            {["Contracts", "Permits", "Insurance", "Compliance", "Renewals", "Deadlines"].map(
              (t, i) => (
                <div key={i} className="flex items-center gap-2 text-[12.5px] font-semibold text-[#4A5568] uppercase tracking-[0.1em]">
                  <span
                    className="w-[6px] h-[6px] rounded-full"
                    style={{
                      background: "#F5A623",
                      boxShadow: "0 0 8px rgba(245,166,35,.18)",
                    }}
                  />
                  {t}
                </div>
              )
            )}
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
            Your business has deadlines that can cost you money, compliance, or leverage. Risk
            Radar shows the most dangerous one first.
          </p>
          <BtnAmber onClick={onEnter}>Open Command Center →</BtnAmber>
        </div>
      </section>
    </div>
  );
}
