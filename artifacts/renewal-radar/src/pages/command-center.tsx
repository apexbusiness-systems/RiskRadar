import { Link } from "wouter";
import { OrbitalRadar } from "@/components/risk-radar/OrbitalRadar";
import { PageHead, BtnAmber, BtnGhost, BtnResolve, BtnGlass } from "@/components/risk-radar/Chrome";
import { RR_DATA } from "@/components/risk-radar/data";

/* ── Most Urgent Due Item card ── */
function HighestRiskNow({ onResolve }: { onResolve: () => void }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: 14,
        padding: "22px 24px",
        background: "linear-gradient(135deg, rgba(245,166,35,.06), #0A0E18)",
        border: "1px solid rgba(245,166,35,.35)",
        boxShadow: "0 0 30px rgba(245,166,35,.2), 0 4px 20px rgba(0,0,0,.5)",
      }}
    >
      {/* Amber top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #F5A623, transparent)" }} />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-[7px] h-[7px] rounded-full inline-block"
          style={{
            background: "#FF4040",
            boxShadow: "0 0 10px #FF4040",
            animation: "pulse-led 1.8s ease-in-out infinite",
          }}
        />
        <span className="text-[10.5px] font-bold text-[#F5A623] uppercase tracking-[0.18em]">
          Most Urgent Due Item
        </span>
      </div>

      <h2 className="text-[22px] font-bold tracking-[-0.02em] leading-tight mb-1.5">
        General Liability Insurance
      </h2>
      <p className="text-[13px] text-[#8898A8] leading-relaxed mb-4.5">
        Coverage expires in <b className="text-[#FF4040]">4 days</b>. Renew before Friday to avoid a gap that may void claims.
      </p>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-2 mb-4.5">
        {[
          { k: "Exposure", v: "Critical", vc: "#FF4040" },
          { k: "Owner", v: "Sarah Chen", vc: "#F0F4F8" },
          { k: "Backup", v: "James Okafor", vc: "#F0F4F8" },
          { k: "Notice closes", v: "Fri May 15", vc: "#F5A623" },
        ].map((m, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 7,
              padding: "8px 12px",
            }}
          >
            <div className="text-[9.5px] font-bold text-[#4A5568] uppercase tracking-[0.14em] mb-1">
              {m.k}
            </div>
            <div className="text-[13px] font-semibold" style={{ color: m.vc }}>
              {m.v}
            </div>
          </div>
        ))}
      </div>

      {/* Notice window progress */}
      <div className="mb-4.5">
        <div className="flex justify-between text-[10px] font-semibold text-[#4A5568] uppercase tracking-[0.12em] mb-1.5">
          <span>Notice window</span>
          <span className="text-[#F5A623]">Closes Friday 17:00 ET</span>
        </div>
        <div className="h-[3px] rounded-sm overflow-hidden" style={{ background: "#151D30" }}>
          <div
            className="h-full rounded-sm"
            style={{
              width: "82%",
              background: "linear-gradient(90deg, #00E676, #F5A623 65%, #FF4040)",
              animation: "fill-bar .8s ease",
            }}
          />
        </div>
      </div>

      {/* Next action */}
      <div
        className="text-[13px] text-[#8898A8] mb-4.5 px-3 py-2.5"
        style={{
          background: "rgba(245,166,35,.06)",
          borderRadius: 7,
          border: "1px solid rgba(245,166,35,.35)",
        }}
      >
        <span className="block text-[10px] font-bold text-[#F5A623] uppercase tracking-[0.12em] mb-1">
          Next action
        </span>
        Renew policy or upload proof of binder to resolve.
      </div>

      <div className="flex gap-2.5">
        <BtnResolve onClick={onResolve}>Resolve risk →</BtnResolve>
        <BtnGlass>Assign backup</BtnGlass>
      </div>
    </div>
  );
}

/* ── Coverage Meter ── */
function CoverageMeter({ value = 82 }: { value?: number }) {
  return (
    <div style={{ background: "#0A0E18", border: "1px solid rgba(255,255,255,.07)", borderRadius: 13, boxShadow: "0 4px 20px rgba(0,0,0,.5)", padding: "18px 20px" }}>
      <div className="flex justify-between items-baseline mb-3">
        <span className="text-[10.5px] font-bold text-[#4A5568] uppercase tracking-[0.14em]">Monitoring Coverage</span>
        <span className="text-2xl font-bold text-[#00E676] tracking-[-0.03em]" style={{ fontVariantNumeric: "tabular-nums" }}>
          {value}%
        </span>
      </div>
      <div className="h-1.5 rounded-md overflow-hidden mb-2.5" style={{ background: "#151D30" }}>
        <div
          className="h-full rounded-md"
          style={{
            width: `${value}%`,
            background: "linear-gradient(90deg, #FF4040 0%, #F5A623 40%, #00E676 100%)",
            animation: "fill-bar 1s ease",
          }}
        />
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {[
          { label: "Protected", v: "27", color: "#00E676" },
          { label: "Needs action", v: "10", color: "#F5A623" },
          { label: "Unowned", v: "4", color: "#FF4040" },
        ].map((s, i) => (
          <div key={i}>
            <div className="text-lg font-bold tracking-[-0.03em]" style={{ color: s.color, fontVariantNumeric: "tabular-nums" }}>
              {s.v}
            </div>
            <div className="text-[10px] text-[#4A5568] font-medium">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Activity Panel ── */
function ActivityPanel() {
  const days = [
    { d: "Mon", v: 3 },
    { d: "Tue", v: 1 },
    { d: "Wed", v: 5 },
    { d: "Thu", v: 2 },
    { d: "Fri", v: 4 },
    { d: "Today", v: 2 },
  ];
  const max = Math.max(...days.map((d) => d.v));
  return (
    <div style={{ background: "#0A0E18", border: "1px solid rgba(255,255,255,.07)", borderRadius: 13, boxShadow: "0 4px 20px rgba(0,0,0,.5)", padding: "18px 20px" }}>
      <div className="flex justify-between items-baseline mb-4">
        <span className="text-[10.5px] font-bold text-[#4A5568] uppercase tracking-[0.14em]">
          Risks resolved · this week
        </span>
        <span className="text-xl font-bold text-[#F5A623]" style={{ fontVariantNumeric: "tabular-nums" }}>
          17
        </span>
      </div>
      <div className="flex items-end gap-1.5 h-10">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm"
              style={{
                height: `${(d.v / max) * 32}px`,
                background: d.d === "Today" ? "#F5A623" : "#151D30",
                transition: "all .3s ease",
              }}
            />
            <span className="text-[9px] text-[#4A5568] font-semibold">{d.d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Deadline Rail ── */
interface RadarItem {
  id: string;
  name: string;
  type: string;
  days: number;
  angle: number;
  exposure: string;
}

function DeadlineRail({ items }: { items: RadarItem[] }) {
  const colorOf = (e: string) =>
    e === "crit" ? "#FF4040" : e === "high" ? "#FF8C00" : e === "med" ? "#00C8F0" : "#00E676";
  const borderOf = (e: string) =>
    e === "crit"
      ? "rgba(255,64,64,.3)"
      : e === "high"
        ? "rgba(255,140,0,.25)"
        : e === "med"
          ? "rgba(0,200,240,.28)"
          : "rgba(0,230,118,.2)";

  return (
    <div style={{ background: "#0A0E18", border: "1px solid rgba(255,255,255,.07)", borderRadius: 13, boxShadow: "0 4px 20px rgba(0,0,0,.5)", overflow: "hidden" }}>
      <div
        className="flex items-center justify-between px-4.5 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}
      >
        <span className="text-[10.5px] font-bold text-[#4A5568] uppercase tracking-[0.16em]">
          Upcoming deadlines · Today → 90 days
        </span>
        <span className="text-[11px] text-[#4A5568]">{items.length} risks</span>
      </div>
      <div className="overflow-x-auto px-4 py-4">
        <div className="flex gap-2.5" style={{ minWidth: "max-content" }}>
          {items.map((it, i) => {
            const c = colorOf(it.exposure);
            const b = borderOf(it.exposure);
            return (
              <Link key={i} href={`/obligations/${it.id}`}>
                <div
                  className="cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
                  style={{
                    background: "#0F1524",
                    border: `1px solid ${b}`,
                    borderRadius: 9,
                    padding: "10px 13px",
                    borderTop: `2px solid ${c}`,
                    minWidth: 140,
                    animation: `stagger-in .3s ease both`,
                    animationDelay: `${i * 0.04}s`,
                  }}
                >
                  <div className="text-[11.5px] font-bold text-[#F0F4F8] leading-tight mb-1.5">
                    {it.name.length > 20 ? it.name.slice(0, 20) + "…" : it.name}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[#4A5568] uppercase tracking-[0.06em]">
                      {it.type}
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: c }}>
                      T-{String(it.days).padStart(2, "0")}D
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Owner Coverage ── */
function OwnerCoverage() {
  const owners = [
    { name: "Sarah Chen", initials: "SC", risks: 14, covered: 12 },
    { name: "James Okafor", initials: "JO", risks: 8, covered: 5 },
    { name: "Maya Rao", initials: "MR", risks: 11, covered: 10 },
    { name: "Unassigned", initials: "—", risks: 4, covered: 0 },
  ];
  return (
    <div style={{ background: "#0A0E18", border: "1px solid rgba(255,255,255,.07)", borderRadius: 13, boxShadow: "0 4px 20px rgba(0,0,0,.5)", overflow: "hidden" }}>
      <div
        className="flex items-center justify-between px-4.5 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}
      >
        <span className="text-[10.5px] font-bold text-[#4A5568] uppercase tracking-[0.16em]">
          Owner coverage
        </span>
      </div>
      {owners.map((o, i) => {
        const pct = o.risks ? Math.round((o.covered / o.risks) * 100) : 0;
        const color = pct >= 80 ? "#00E676" : pct >= 50 ? "#F5A623" : "#FF4040";
        return (
          <div
            key={i}
            className="grid items-center gap-2.5 px-4 py-2.75"
            style={{
              gridTemplateColumns: "32px 1fr 40px",
              borderBottom: i < owners.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none",
            }}
          >
            <div
              className="w-[30px] h-[30px] rounded-full grid place-items-center text-[11px] font-bold shrink-0"
              style={{
                background: o.initials === "—" ? "transparent" : "#151D30",
                border:
                  o.initials === "—"
                    ? "1.5px dashed #4A5568"
                    : `1px solid ${color}44`,
                color: o.initials === "—" ? "#4A5568" : "#F5A623",
              }}
            >
              {o.initials}
            </div>
            <div>
              <div
                className="text-[13px] font-semibold mb-1"
                style={{ color: o.initials === "—" ? "#FF4040" : "#F0F4F8" }}
              >
                {o.name}
              </div>
              <div className="h-[3px] rounded-sm overflow-hidden" style={{ background: "#151D30" }}>
                <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
            <div
              className="text-[13px] font-bold text-right"
              style={{ color, fontVariantNumeric: "tabular-nums" }}
            >
              {pct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Command Center Page ── */
export default function CommandCenterPage() {
  const data = RR_DATA;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHead
        title="Command Center"
        sub="Today's business risk signal. Your company's deadline exposure at a glance."
        actions={
          <>
            <BtnGhost>Signal Log</BtnGhost>
            <BtnAmber>+ Add risk</BtnAmber>
          </>
        }
      />
      <div
        className="flex-1 overflow-y-auto grid gap-4 px-5.5 pb-7 pt-4.5"
        style={{
          gridTemplateColumns: "1fr 380px",
          minHeight: 0,
        }}
      >
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Radar */}
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(0,200,240,.06), #0A0E18)",
              border: "1px solid rgba(0,200,240,.28)",
              boxShadow: "0 0 30px rgba(0,200,240,.15), 0 4px 20px rgba(0,0,0,.5)",
            }}
          >
            <div
              className="flex items-center justify-between px-4.5 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}
            >
              <span className="text-[10.5px] font-bold text-[#4A5568] uppercase tracking-[0.16em]">
                Orbital Risk Map · {data.radar.length} active signals
              </span>
              <span className="text-[11px] text-[#00C8F0]">Sweep 10s · live</span>
            </div>
            <div className="flex justify-center py-2 pb-3">
              <OrbitalRadar size={440} />
            </div>
          </div>

          {/* Deadline rail */}
          <DeadlineRail items={data.radar.slice(0, 10)} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5">
          <HighestRiskNow onResolve={() => {}} />
          <CoverageMeter value={82} />
          <ActivityPanel />
          <OwnerCoverage />
        </div>
      </div>
    </div>
  );
}
