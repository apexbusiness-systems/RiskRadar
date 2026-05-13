import { PageHead, BtnAmber, BtnGhost } from "@/components/risk-radar/Chrome";

export default function RiskIntakePage() {
  return (
    <>
      <PageHead
        title="Due Intake"
        sub="Turn your spreadsheet into monitored business risk — in under 3 minutes."
        actions={
          <>
            <BtnGhost>Cancel</BtnGhost>
            <BtnAmber>Continue →</BtnAmber>
          </>
        }
      />
      <div className="px-6.5 py-4.5 overflow-auto" style={{ height: "calc(100% - 82px)" }}>
        {/* Hero card */}
        <div
          className="mb-4"
          style={{
            background: "#0A0E18",
            border: "1px solid rgba(245,166,35,.35)",
            borderRadius: 18,
            boxShadow: "0 0 30px rgba(245,166,35,.2), 0 4px 20px rgba(0,0,0,.5)",
            padding: "28px 32px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "center",
          }}
        >
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.02em] mb-2.5">
              Turn a spreadsheet into monitored business risk.
            </h2>
            <p className="text-sm text-[#8898A8] leading-relaxed">
              Upload your CSV. DueRadar maps columns, validates dates, arms reminders, and
              assigns owners. From row to radar in minutes.
            </p>
          </div>

          {/* Before/After */}
          <div className="grid gap-3 items-center" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
            {/* Before */}
            <div
              style={{
                background: "#0F1524",
                border: "1px solid rgba(255,255,255,.07)",
                borderRadius: 9,
                padding: 14,
                fontSize: 11,
                color: "#4A5568",
                minHeight: 110,
              }}
            >
              <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#4A5568] mb-2.5">
                Before · Spreadsheet
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  color: "#4A5568",
                  lineHeight: 1.9,
                }}
              >
                Insurance &nbsp; 4/16 &nbsp; Hartford
                <br />
                Permit &nbsp;&nbsp;&nbsp;&nbsp; ? &nbsp;&nbsp;&nbsp; —
                <br />
                Contract &nbsp; 5/23 &nbsp; Anvil
                <br />
                License &nbsp;&nbsp; 5-31 &nbsp; MA
                <br />
                Subs. &nbsp;&nbsp;&nbsp;&nbsp; 6/15 &nbsp; SFDC
              </div>
            </div>

            {/* Arrow */}
            <div className="text-xl font-bold text-[#F5A623]" style={{ textShadow: "0 0 10px rgba(245,166,35,.18)" }}>
              →
            </div>

            {/* After */}
            <div
              style={{
                background: "#0F1524",
                border: "1px solid rgba(0,230,118,.25)",
                borderRadius: 9,
                padding: 14,
                fontSize: 11,
                color: "#4A5568",
                minHeight: 110,
              }}
            >
              <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#4A5568] mb-2.5">
                After · Monitored
              </div>
              {[
                { n: "G/L Insurance", d: "T-04D" },
                { n: "Anvil MSA", d: "T-11D" },
                { n: "MA Liquor", d: "T-19D" },
                { n: "Salesforce", d: "T-34D" },
                { n: "+79 more…", d: "ARMED" },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex justify-between py-[3px] text-[11px] text-[#8898A8]"
                  style={{
                    borderBottom:
                      i < 4 ? "1px solid rgba(255,255,255,.07)" : "none",
                  }}
                >
                  <b className="text-[#F0F4F8] font-semibold flex items-center gap-[5px]">
                    <span
                      className="w-[7px] h-[7px] rounded-full inline-block"
                      style={{
                        background: "#00E676",
                        boxShadow: "0 0 6px rgba(0,230,118,.13)",
                      }}
                    />
                    {row.n}
                  </b>
                  <span className="text-[#00E676] font-bold">{row.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Steps list */}
        <div
          className="overflow-hidden"
          style={{
            background: "#0A0E18",
            border: "1px solid rgba(255,255,255,.07)",
            borderRadius: 13,
          }}
        >
          {[
            { n: "01", label: "Upload source", sub: "Drop your CSV — up to 10,000 rows", state: "done" },
            { n: "02", label: "Map fields", sub: "Match columns to risk fields (9/11 auto-detected)", state: "active" },
            { n: "03", label: "Validate risks", sub: "Date sanity, owner emails, duplicate detection", state: "" },
            { n: "04", label: "Activate monitoring", sub: "Arm reminders, assign owners, publish to radar", state: "" },
          ].map((s, i) => (
            <div
              key={i}
              className="grid items-center gap-4.5 px-5.5 py-4"
              style={{
                gridTemplateColumns: "54px 1fr auto",
                borderBottom:
                  i < 3 ? "1px solid rgba(255,255,255,.07)" : "none",
              }}
            >
              <div
                className="text-xl font-bold tracking-[-0.02em]"
                style={{
                  color:
                    s.state === "done" ? "#00E676" : s.state === "active" ? "#F5A623" : "#4A5568",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.n}
              </div>
              <div>
                <b className="text-sm font-bold block mb-0.5">{s.label}</b>
                <small className="text-[12.5px] text-[#4A5568]">{s.sub}</small>
              </div>
              <div
                className="text-[11px] font-bold text-[#4A5568] uppercase tracking-[0.1em] whitespace-nowrap"
                style={{
                  color:
                    s.state === "done"
                      ? "#00E676"
                      : s.state === "active"
                        ? "#F5A623"
                        : "#4A5568",
                }}
              >
                {s.state === "done" ? "Complete ✓" : s.state === "active" ? "In progress" : "Pending"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
