import { Link } from "wouter";
import { PageHead, BtnGhost, BtnResolve } from "@/components/risk-radar/Chrome";
import { RR_DATA } from "@/components/risk-radar/data";

export default function RiskRecordPage() {
  const r = RR_DATA.record;

  return (
    <>
      <PageHead
        title="Due Record"
        sub={
          <>
            <Link href="/obligations" className="text-[#F5A623] cursor-pointer">
              ← Due Register
            </Link>{" "}
            · {r.id} · {r.name}
          </>
        }
        actions={
          <>
            <BtnGhost>Export PDF</BtnGhost>
            <BtnResolve>Resolve risk</BtnResolve>
          </>
        }
      />
      <div
        className="grid gap-4 px-6.5 py-4.5 overflow-auto"
        style={{
          gridTemplateColumns: "1.6fr 1fr",
          height: "calc(100% - 82px)",
        }}
      >
        {/* Left column */}
        <div>
          {/* Main card */}
          <div
            className="mb-3.5"
            style={{
              background: "#0A0E18",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 13,
              padding: "20px 24px",
            }}
          >
            <div className="flex items-center gap-2 mb-3.5">
              <span
                className="w-[10px] h-[10px] rounded-[2px] inline-block"
                style={{ background: "#FF4040", boxShadow: "0 0 8px rgba(255,64,64,.15)" }}
              />
              <span className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.14em]">
                {r.typeLabel}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-[-0.02em] mb-1.5">{r.name}</h2>
            <p className="text-[13.5px] text-[#8898A8] mb-4.5">{r.sub}</p>

            {/* Countdown grid */}
            <div
              className="grid grid-cols-4 gap-px mb-4.5 overflow-hidden"
              style={{ background: "rgba(255,255,255,.07)", borderRadius: 9 }}
            >
              {r.countdown.map((c, i) => (
                <div key={i} style={{ background: "#0A0E18", padding: 14 }}>
                  <div className="text-[10px] text-[#4A5568] font-semibold uppercase tracking-[0.1em] mb-1">
                    {c.k}
                  </div>
                  <div
                    className="text-[26px] font-bold tracking-[-0.025em]"
                    style={{
                      color: c.klass === "crit" ? "#FF4040" : "#F0F4F8",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {c.v}
                  </div>
                </div>
              ))}
            </div>

            {/* KV grid */}
            <div className="grid text-[13.5px]" style={{ gridTemplateColumns: "108px 1fr", rowGap: 11 }}>
              {r.kv.map((kv, i) => (
                <div key={i} className="contents">
                  <div className="text-[#4A5568] font-medium">{kv.k}</div>
                  <div className="text-[#F0F4F8]">{kv.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action history */}
          <div
            style={{
              background: "#0A0E18",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 13,
              padding: "20px 24px",
            }}
          >
            <h4 className="text-[10.5px] font-bold text-[#4A5568] uppercase tracking-[0.16em] mb-3.5">
              Action history
            </h4>
            {r.events.map((e, i) => (
              <div
                key={i}
                className="grid items-start gap-2.5 py-2 text-[13px]"
                style={{
                  gridTemplateColumns: "86px 13px 1fr",
                  borderBottom:
                    i < r.events.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none",
                }}
              >
                <div className="text-[#4A5568] text-[11px]">{e.when}</div>
                <div
                  className="w-2 h-2 rounded-full mt-[3px]"
                  style={{
                    background:
                      (e.lvl as string) === "warn"
                        ? "#F5A623"
                        : (e.lvl as string) === "crit"
                          ? "#FF4040"
                          : (e.lvl as string) === "safe"
                            ? "#00E676"
                            : "#151D30",
                    boxShadow:
                      (e.lvl as string) === "warn"
                        ? "0 0 6px rgba(245,166,35,.18)"
                        : (e.lvl as string) === "crit"
                          ? "0 0 6px rgba(255,64,64,.15)"
                          : (e.lvl as string) === "safe"
                            ? "0 0 6px rgba(0,230,118,.13)"
                            : "none",
                    border: (e.lvl as string) ? "none" : "1px solid rgba(255,255,255,.07)",
                  }}
                />
                <div>
                  <b className="font-semibold">{e.title}</b>
                  <small className="block text-[#4A5568] mt-0.5">{e.sub}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Reminder rules */}
          <div
            className="mb-3.5"
            style={{
              background: "#0A0E18",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 13,
              padding: "20px 24px",
            }}
          >
            <h4 className="text-[10.5px] font-bold text-[#4A5568] uppercase tracking-[0.16em] mb-3.5">
              Reminder rules
            </h4>
            {r.reminders.map((rm, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 text-[13.5px]"
                style={{
                  borderBottom:
                    i < r.reminders.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none",
                }}
              >
                <div>
                  <div className="font-semibold text-[13.5px]">{rm.nm}</div>
                  <div className="text-xs text-[#4A5568] mt-0.5">{rm.sub}</div>
                </div>
                <div
                  className="w-[34px] h-5 rounded-[10px] relative cursor-pointer shrink-0 transition-[background] duration-150"
                  style={{
                    background: rm.on ? "#00E676" : "#151D30",
                    border: rm.on ? "1px solid #00E676" : "1px solid rgba(255,255,255,.07)",
                  }}
                >
                  <div
                    className="absolute top-[2px] w-[14px] h-[14px] rounded-full transition-left duration-150"
                    style={{
                      left: rm.on ? "16px" : "2px",
                      background: rm.on ? "#001208" : "#4A5568",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Resolution path */}
          <div
            style={{
              background: "#0A0E18",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 13,
              padding: "20px 24px",
            }}
          >
            <h4 className="text-[10.5px] font-bold text-[#4A5568] uppercase tracking-[0.16em] mb-3.5">
              Resolution path
            </h4>
            {r.path.map((p, i) => {
              const state = p.state as string | undefined;
              return (
                <div
                  key={i}
                  className="grid gap-2.5 py-2 text-[13.5px]"
                  style={{ gridTemplateColumns: "26px 1fr" }}
                >
                  <div
                    className="w-[22px] h-[22px] rounded-full border grid place-items-center text-[10.5px] font-bold"
                    style={{
                      borderColor:
                        state === "done"
                          ? "#00E676"
                          : state === "active"
                            ? "#F5A623"
                            : "rgba(255,255,255,.07)",
                      background:
                        state === "done"
                          ? "#00E676"
                          : state === "active"
                            ? "#F5A623"
                            : "transparent",
                      color:
                        state === "done" ? "#001208" : state === "active" ? "#0F0800" : "#4A5568",
                    }}
                  >
                    {state === "done" ? "✓" : p.idx}
                  </div>
                  <div>
                    <b className="font-semibold">{p.nm}</b>
                    <small className="block text-[#4A5568] text-xs mt-0.5">{p.sub}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
