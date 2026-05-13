import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/* ── RadarMark SVG ── */
export function RadarMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <circle cx="15" cy="15" r="13" stroke="rgba(245,166,35,.4)" strokeWidth="1" />
      <circle cx="15" cy="15" r="8" stroke="rgba(245,166,35,.6)" strokeWidth="1" />
      <circle cx="15" cy="15" r="3" fill="#F5A623" />
      <line x1="15" y1="2" x2="15" y2="6" stroke="rgba(245,166,35,.5)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="15" y1="24" x2="15" y2="28" stroke="rgba(245,166,35,.5)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="2" y1="15" x2="6" y2="15" stroke="rgba(245,166,35,.5)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="15" x2="28" y2="15" stroke="rgba(245,166,35,.5)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Sidebar Navigation ── */
interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "command", label: "Command Center", icon: "◎", href: "/dashboard" },
  { id: "register", label: "Due Register", icon: "≡", href: "/obligations", badge: "10" },
  { id: "record", label: "Due Record", icon: "◈", href: "/obligations/new" },
  { id: "intake", label: "Due Intake", icon: "↑", href: "/import" },
];

const OPS_ITEMS: NavItem[] = [
  { id: "delivery", label: "Signal Log", icon: "", href: "/delivery" },
  { id: "audit", label: "Activity Ledger", icon: "", href: "/audit" },
  { id: "workspace", label: "Mission Control", icon: "", href: "/workspace" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ?? "U";

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : user?.emailAddresses[0]?.emailAddress ?? "Ops Lead";

  const isActive = (href: string) => {
    if (href === "/dashboard") return location === "/" || location === "/dashboard";
    return location.startsWith(href);
  };

  return (
    <aside
      className="flex flex-col px-2.5 py-4.5 gap-0.5 relative overflow-hidden border-r shrink-0"
      style={{
        background: "linear-gradient(180deg, #07090F 0%, #050709 100%)",
        borderRight: "1px solid rgba(255,255,255,.07)",
        width: 218,
        minWidth: 218,
      }}
    >
      {/* Amber edge glow */}
      <div
        className="absolute right-0 top-[20%] bottom-[20%] w-px pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent, rgba(245,166,35,.35), transparent)" }}
      />

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pb-5.5">
        <RadarMark size={30} />
        <div className="leading-none">
          <div className="text-[15px] font-bold text-[#F0F4F8]">
            Due<span className="text-[#F5A623]">Radar</span>
          </div>
          <small className="block text-[9.5px] font-medium text-[#4A5568] mt-0.5 uppercase tracking-[0.14em]">
            Deadline warning system
          </small>
        </div>
      </div>

      {/* Command section */}
      <div className="text-[9.5px] font-bold text-[#4A5568] uppercase tracking-[0.18em] px-3 pt-3.5 pb-1.5">
        Command
      </div>
      {NAV_ITEMS.map((it) => {
        const active = isActive(it.href);
        return (
          <Link key={it.id} href={it.href}>
            <button
              className={cn(
                "flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13px] font-medium w-full text-left transition-all duration-150 relative border border-transparent",
                active
                  ? "bg-[rgba(245,166,35,.18)] text-[#FFB84D] font-semibold border-[rgba(245,166,35,.35)]"
                  : "text-[#8898A8] hover:bg-[rgba(255,255,255,.04)] hover:text-[#F0F4F8]"
              )}
              data-testid={`nav-link-${it.id}`}
            >
              <span
                className={cn(
                  "w-[18px] h-[18px] grid place-items-center shrink-0 opacity-60",
                  active && "opacity-100"
                )}
              >
                {it.icon}
              </span>
              {it.label}
              {it.badge && (
                <span className="ml-auto bg-[#FF4040] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {it.badge}
                </span>
              )}
            </button>
          </Link>
        );
      })}

      {/* Divider */}
      <div className="h-px bg-[rgba(255,255,255,.07)] my-2" />

      {/* Operations section */}
      <div className="text-[9.5px] font-bold text-[#4A5568] uppercase tracking-[0.18em] px-3 py-1.5">
        Operations
      </div>
      {OPS_ITEMS.map((it) => (
        <Link key={it.id} href={it.href}>
          <button
            className="flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13px] font-medium w-full text-left text-[#8898A8] hover:bg-[rgba(255,255,255,.04)] hover:text-[#F0F4F8] transition-all duration-150 opacity-50"
            data-testid={`nav-link-${it.id}`}
          >
            <span className="w-[18px] h-[18px] grid place-items-center shrink-0 opacity-60">·</span>
            {it.label}
          </button>
        </Link>
      ))}

      {/* User footer */}
      <div className="mt-auto pt-3.5 px-2.5 border-t border-[rgba(255,255,255,.07)] flex items-center gap-2.5">
        <div
          className="w-[30px] h-[30px] rounded-full grid place-items-center text-[11.5px] font-bold text-[#8898A8] shrink-0 bg-[#151D30] border border-[rgba(245,166,35,.2)]"
        >
          {initials}
        </div>
        <div className="text-xs leading-snug min-w-0">
          <div className="text-[#F0F4F8] font-medium truncate">{displayName}</div>
          <small className="block text-[10px] text-[#4A5568]">Ops Lead</small>
        </div>
        <button
          onClick={() => signOut()}
          className="ml-auto text-[#4A5568] hover:text-[#FF4040] transition-colors"
          data-testid="button-sign-out"
          title="Sign out"
        >
          →
        </button>
      </div>
    </aside>
  );
}

/* ── Status Bar ── */
export function StatusBar() {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="h-9 flex items-center gap-4 px-5.5 shrink-0"
      style={{
        background: "#0A0E18",
        borderBottom: "1px solid rgba(255,255,255,.07)",
      }}
    >
      {/* Green LED */}
      <div
        className="w-[7px] h-[7px] rounded-full shrink-0"
        style={{
          background: "#00E676",
          boxShadow: "0 0 8px #00E676",
          animation: "pulse-led 2.5s ease-in-out infinite",
        }}
      />
      <span className="text-[11px] text-[#4A5568] font-medium tracking-[0.06em]">
        <b className="text-[#8898A8] font-semibold">DueRadar</b> · Live monitoring
      </span>

      <span
        className="inline-flex items-center gap-[5px] text-[11px] font-semibold px-2.5 py-[3px] rounded-full text-[#FF4040]"
        style={{ background: "rgba(255,64,64,.15)", border: "1px solid rgba(255,64,64,.2)" }}
      >
        <span className="w-[5px] h-[5px] rounded-full bg-current" style={{ animation: "pulse-led 2s ease-in-out infinite" }} />
        3 Critical
      </span>
      <span
        className="inline-flex items-center gap-[5px] text-[11px] font-semibold px-2.5 py-[3px] rounded-full text-[#F5A623]"
        style={{ background: "rgba(245,166,35,.18)", border: "1px solid rgba(245,166,35,.35)" }}
      >
        <span className="w-[5px] h-[5px] rounded-full bg-current" style={{ animation: "pulse-led 2s ease-in-out infinite" }} />
        7 Due soon
      </span>
      <span
        className="inline-flex items-center gap-[5px] text-[11px] font-semibold px-2.5 py-[3px] rounded-full text-[#00E676]"
        style={{ background: "rgba(0,230,118,.13)", border: "1px solid rgba(0,230,118,.2)" }}
      >
        <span className="w-[5px] h-[5px] rounded-full bg-current" style={{ animation: "pulse-led 2s ease-in-out infinite" }} />
        27 Protected
      </span>

      <span className="ml-auto text-[11.5px] text-[#4A5568] tracking-[0.06em]">
        {clock} ET · 47 deadlines monitored
      </span>
    </div>
  );
}

/* ── Page Head ── */
export function PageHead({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-end justify-between px-6.5 py-5 shrink-0"
      style={{
        background: "#0A0E18",
        borderBottom: "1px solid rgba(255,255,255,.07)",
      }}
    >
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#F0F4F8] mb-1">{title}</h1>
        {sub && <p className="text-[13px] text-[#8898A8] m-0">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

/* ── Button primitives ── */
export function BtnAmber({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-[7px] px-4 py-[9px] rounded-lg text-[13.5px] font-semibold transition-all duration-150 whitespace-nowrap",
        className
      )}
      style={{
        background: "#F5A623",
        color: "#0F0800",
        border: "1px solid #F5A623",
        boxShadow: "0 0 16px rgba(245,166,35,.18)",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = "brightness(1.1)";
        e.currentTarget.style.boxShadow = "0 0 24px rgba(245,166,35,.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = "";
        e.currentTarget.style.boxShadow = "0 0 16px rgba(245,166,35,.18)";
      }}
    >
      {children}
    </button>
  );
}

export function BtnGhost({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      className="inline-flex items-center gap-[7px] px-4 py-[9px] rounded-lg text-[13.5px] font-semibold transition-all duration-150 whitespace-nowrap text-[#8898A8] border border-[rgba(255,255,255,.07)] hover:bg-[rgba(255,255,255,.04)] hover:text-[#F0F4F8] hover:border-[rgba(0,200,240,.28)]"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function BtnResolve({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      className="inline-flex items-center gap-[7px] px-4 py-[9px] rounded-lg text-[13.5px] font-semibold transition-all duration-150 whitespace-nowrap"
      style={{
        background: "#FF4040",
        color: "#fff",
        border: "1px solid #FF4040",
        boxShadow: "0 0 12px rgba(255,64,64,.15)",
      }}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
    >
      {children}
    </button>
  );
}

export function BtnGlass({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      className="inline-flex items-center gap-[7px] px-4 py-[9px] rounded-lg text-[13.5px] font-semibold transition-all duration-150 whitespace-nowrap text-[#8898A8] bg-[rgba(255,255,255,.04)] border border-[rgba(255,255,255,.07)] hover:bg-[rgba(255,255,255,.07)] hover:text-[#F0F4F8]"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
