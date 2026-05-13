import { useState } from "react";
import { Link } from "wouter";
import { PageHead, BtnAmber, BtnGhost } from "@/components/risk-radar/Chrome";
import { RR_DATA } from "@/components/risk-radar/data";

/* ── Helper functions ── */
const ownerName = (o: string | null) =>
  o === "SC" ? "Sarah Chen" : o === "JO" ? "James Okafor" : o === "MR" ? "Maya Rao" : null;

const typeLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const statusBadgeClass = (s: string) =>
  s === "crit"
    ? "text-[#FF4040] bg-[rgba(255,64,64,.15)] border-[rgba(255,64,64,.2)]"
    : s === "notice"
      ? "text-[#F5A623] bg-[rgba(245,166,35,.18)] border-[rgba(245,166,35,.35)]"
      : s === "armed"
        ? "text-[#00E676] bg-[rgba(0,230,118,.13)] border-[rgba(0,230,118,.2)]"
        : "text-[#4A5568] bg-[rgba(255,255,255,.04)] border-[rgba(255,255,255,.07)]";

const statusLabel = (s: string) =>
  s === "crit" ? "Critical" : s === "notice" ? "In notice" : s === "armed" ? "On track" : "Idle";

const expColor = (e: string) =>
  e === "crit" ? "#FF4040" : e === "high" ? "#FF8C00" : e === "med" ? "#00C8F0" : "#00E676";

const expLabel = (e: string) =>
  e === "crit" ? "Critical" : e === "high" ? "High" : e === "med" ? "Medium" : "Low";

export default function RiskRegisterPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const rows = RR_DATA.register.filter((r) => {
    if (filter === "crit" && r.status !== "crit") return false;
    if (filter === "notice" && r.status !== "notice") return false;
    if (filter === "armed" && r.status !== "armed") return false;
    if (filter === "noown" && r.owner !== null) return false;
    if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <PageHead
        title="Due Register"
        sub="All business deadlines, renewals, permits, contracts, and compliance dates in one monitored system."
        actions={
          <>
            <BtnGhost>Export</BtnGhost>
            <BtnAmber>+ Add risk</BtnAmber>
          </>
        }
      />
      <div className="px-6.5 pt-4.5 pb-8 overflow-auto" style={{ height: "calc(100% - 82px)" }}>
        {/* Toolbar */}
        <div className="flex gap-2.5 mb-3.5 items-center">
          <div
            className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 transition-[border-color] duration-150 focus-within:shadow-[0_0_0_3px_rgba(0,200,240,.12)]"
            style={{
              background: "#0A0E18",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 9,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
              <circle cx="6" cy="6" r="4.5" stroke="#4A5568" strokeWidth="1.3" />
              <path d="M9.5 9.5L12 12" stroke="#4A5568" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              placeholder="Scan contracts, permits, insurance, vendors…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 border-0 outline-0 bg-transparent text-[#F0F4F8] text-[13.5px] font-['Space_Grotesk',sans-serif]"
              style={{ "::placeholder": { color: "#4A5568" } } as React.CSSProperties}
            />
          </div>
          <div
            className="flex gap-[3px] px-[3px] py-[3px]"
            style={{
              background: "#0A0E18",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 9,
            }}
          >
            {(
              [
                ["all", "All"],
                ["crit", "Critical"],
                ["notice", "In notice"],
                ["armed", "On track"],
                ["noown", "No owner"],
              ] as const
            ).map(([id, lbl]) => (
              <button
                key={id}
                className={`border-0 bg-transparent text-[11.5px] font-semibold px-2.5 py-1.5 rounded-md cursor-pointer transition-all duration-[120ms] ${
                  filter === id
                    ? "bg-[rgba(255,255,255,.07)] text-[#F0F4F8]"
                    : "text-[#4A5568]"
                }`}
                onClick={() => setFilter(id)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div
          className="overflow-hidden"
          style={{
            background: "#0A0E18",
            border: "1px solid rgba(255,255,255,.07)",
            borderRadius: 13,
          }}
        >
          {/* Header row */}
          <div
            className="grid items-center px-4.5 py-3 gap-3.5 text-[10.5px] font-bold text-[#4A5568] uppercase tracking-[0.1em]"
            style={{
              gridTemplateColumns: "minmax(0,2.2fr) 1fr 1fr 1.2fr 1fr 1.3fr 100px",
              background: "rgba(255,255,255,.02)",
              borderBottom: "1px solid rgba(255,255,255,.07)",
            }}
          >
            <div>Risk</div>
            <div>Category</div>
            <div>Exposure</div>
            <div>Due / Notice</div>
            <div>Owner</div>
            <div>Next action</div>
            <div>Status</div>
          </div>
          {/* Data rows */}
          {rows.map((r, i) => (
            <Link key={i} href={`/obligations/${r.id}`}>
              <div
                className="grid items-center px-4.5 py-3 gap-3.5 text-[13.5px] cursor-pointer transition-[background] duration-[120ms] hover:bg-[linear-gradient(90deg,rgba(0,200,240,.04),rgba(0,200,240,.01))]"
                style={{
                  gridTemplateColumns: "minmax(0,2.2fr) 1fr 1fr 1.2fr 1fr 1.3fr 100px",
                  borderBottom:
                    i < rows.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none",
                }}
              >
                {/* Risk name */}
                <div className="font-semibold">
                  {r.name}
                  <small className="block text-[#4A5568] text-xs font-normal mt-px">{r.sub}</small>
                </div>

                {/* Category */}
                <div>
                  <span
                    className="inline-block text-[10.5px] font-bold px-2 py-[3px] rounded uppercase tracking-[0.06em]"
                    style={{
                      background: "rgba(255,255,255,.04)",
                      color: "#8898A8",
                      border: "1px solid rgba(255,255,255,.07)",
                    }}
                  >
                    {typeLabel(r.type)}
                  </span>
                </div>

                {/* Exposure */}
                <div>
                  <span className="text-[12.5px] font-bold" style={{ color: expColor(r.exposure) }}>
                    {expLabel(r.exposure)}
                  </span>
                  <div className="h-1 rounded-sm overflow-hidden mt-1" style={{ background: "#151D30" }}>
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width:
                          r.status === "armed"
                            ? "85%"
                            : r.status === "notice"
                              ? "50%"
                              : r.status === "crit"
                                ? "20%"
                                : "35%",
                        background: expColor(r.exposure),
                      }}
                    />
                  </div>
                </div>

                {/* Due date */}
                <div className="text-[13px] text-[#8898A8]">{r.due}</div>

                {/* Owner */}
                <div className="flex items-center gap-[7px] text-[13px] text-[#8898A8]">
                  {ownerName(r.owner) ? (
                    <>
                      <span
                        className="w-[22px] h-[22px] rounded-full grid place-items-center text-[9.5px] font-bold shrink-0"
                        style={{
                          background: "#151D30",
                          color: "#F5A623",
                          border: "1px solid rgba(245,166,35,.35)",
                        }}
                      >
                        {r.owner}
                      </span>
                      {ownerName(r.owner)?.split(" ")[0]}
                    </>
                  ) : (
                    <>
                      <span
                        className="w-[22px] h-[22px] rounded-full grid place-items-center text-[9.5px] font-bold shrink-0"
                        style={{
                          background: "transparent",
                          border: "1px dashed #4A5568",
                          color: "#4A5568",
                        }}
                      >
                        —
                      </span>
                      <span className="text-[#FF4040] text-xs">Unassigned</span>
                    </>
                  )}
                </div>

                {/* Action */}
                <div className="text-[12.5px] text-[#8898A8]">
                  <span className="text-[#F5A623] font-semibold">{r.action}</span>
                </div>

                {/* Status badge */}
                <div>
                  <span
                    className={`inline-flex items-center gap-[5px] text-[11.5px] font-bold px-2 py-[3px] rounded-full border whitespace-nowrap ${statusBadgeClass(r.status)}`}
                  >
                    <span className="w-[5px] h-[5px] rounded-full bg-current" />
                    {statusLabel(r.status)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
