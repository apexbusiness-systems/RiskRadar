import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  RadarIcon,
  ArrowRight,
  ShieldCheck,
  Bell,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Lock,
  TrendingUp,
  BarChart3,
  ChevronRight,
  Mail,
  Calendar,
  RefreshCw,
  ClipboardCheck,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────── Radar SVG Component ─────────────── */
function RadarSweep({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={cn("w-full h-full", className)} aria-hidden>
      <defs>
        <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0a0f1e" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="sweep-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <clipPath id="radar-circle">
          <circle cx="100" cy="100" r="90" />
        </clipPath>
      </defs>

      {/* Background */}
      <circle cx="100" cy="100" r="95" fill="url(#radar-bg)" stroke="#1e3a5f" strokeWidth="1" />

      {/* Concentric rings */}
      {[22, 44, 66, 88].map((r) => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#1e4a7a" strokeWidth="0.5" opacity="0.6" />
      ))}

      {/* Cross hairs */}
      <line x1="100" y1="12" x2="100" y2="188" stroke="#1e4a7a" strokeWidth="0.4" opacity="0.5" />
      <line x1="12" y1="100" x2="188" y2="100" stroke="#1e4a7a" strokeWidth="0.4" opacity="0.5" />

      {/* Sweep wedge */}
      <g clipPath="url(#radar-circle)">
        <path
          d="M100,100 L190,60 A95,95 0 0,0 100,5 Z"
          fill="url(#sweep-grad)"
          opacity="0.85"
          style={{ transformOrigin: "100px 100px", animation: "radarSpin 3s linear infinite" }}
        />
      </g>

      {/* Obligation blips */}
      <circle cx="145" cy="68" r="3.5" fill="#f59e0b" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="78" cy="52" r="2.5" fill="#3b82f6" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="155" cy="130" r="3" fill="#10b981" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="140" r="2" fill="#ef4444" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="120" cy="155" r="2.5" fill="#a78bfa" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.15;0.8" dur="3s" repeatCount="indefinite" />
      </circle>

      {/* Center dot */}
      <circle cx="100" cy="100" r="3" fill="#f59e0b" />
      <circle cx="100" cy="100" r="6" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.5" />

      <style>{`
        @keyframes radarSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}

/* ─────────────── Renewal Ring ─────────────── */
function RenewalRing({ pct, color, label, days }: { pct: number; color: string; label: string; days: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
          <circle
            cx="36" cy="36" r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{days}</span>
        </div>
      </div>
      <span className="text-[11px] text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
}

/* ─────────────── Obligation Card ─────────────── */
function ObligationCard({ title, category, status, days, color }: {
  title: string; category: string; status: string; days: string; color: string;
}) {
  const statusColors: Record<string, string> = {
    "Active": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Due Soon": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Overdue": "bg-red-500/10 text-red-400 border-red-500/20",
    "Completed": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return (
    <div className={`rounded-xl border bg-slate-900/60 p-4 backdrop-blur-sm ${color} hover:-translate-y-0.5 transition-transform`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-white text-sm font-semibold leading-tight">{title}</p>
          <p className="text-slate-400 text-xs mt-0.5">{category}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[status] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
          {status}
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <Clock className="w-3 h-3" />
        {days}
      </div>
    </div>
  );
}

/* ─────────────── Before/After spreadsheet cell ─────────────── */
function SpreadsheetChaos() {
  const rows = [
    ["Business License", "6/30/2024??", "❓", "maybe sarah"],
    ["General Liability", "EXPIRED", "🔴", ""],
    ["Domain renewal", "sometime", "❓", "IT??"],
    ["Worker's comp", "Last year?", "❓", "HR"],
    ["Software license", "idk", "🔴", "bob left"],
    ["State tax filing", "quarterly?", "❓", "accountant"],
  ];
  return (
    <div className="rounded-xl overflow-hidden border border-red-900/40 text-[10px] font-mono">
      <div className="bg-red-950/40 border-b border-red-900/30 grid grid-cols-4 gap-0">
        {["Obligation", "Due Date", "Status", "Owner"].map(h => (
          <div key={h} className="px-2 py-1.5 text-red-300/70 font-semibold uppercase tracking-wide">{h}</div>
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={i} className={`grid grid-cols-4 border-b border-red-900/20 ${i % 2 === 0 ? "bg-red-950/20" : "bg-slate-900/40"}`}>
          {row.map((cell, j) => (
            <div key={j} className={`px-2 py-1.5 truncate ${cell.includes("EXPIRED") || cell.includes("🔴") ? "text-red-400" : "text-slate-400"}`}>
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Cockpit mockup ─────────────── */
function CockpitMockup() {
  return (
    <div className="rounded-xl overflow-hidden border border-emerald-800/30 bg-slate-900/80 text-[10px]">
      {/* Mini metrics */}
      <div className="grid grid-cols-3 gap-0 border-b border-slate-700/40">
        {[
          { l: "Active", v: "14", c: "text-blue-400", b: "border-blue-500" },
          { l: "Due Soon", v: "3", c: "text-amber-400", b: "border-amber-500" },
          { l: "Overdue", v: "0", c: "text-emerald-400", b: "border-emerald-500" },
        ].map(m => (
          <div key={m.l} className={`p-3 border-l-2 ${m.b}`}>
            <p className="text-slate-400 uppercase tracking-wide text-[9px]">{m.l}</p>
            <p className={`text-xl font-black ${m.c}`}>{m.v}</p>
          </div>
        ))}
      </div>
      {/* Obligation rows */}
      {[
        { title: "Business License", cat: "Licensing", status: "Active", due: "Jun 30", c: "text-blue-400" },
        { title: "General Liability", cat: "Insurance", status: "Active", due: "Aug 14", c: "text-blue-400" },
        { title: "Domain Renewal", cat: "Software", status: "Due Soon", due: "May 18", c: "text-amber-400" },
        { title: "Worker's Comp", cat: "Insurance", status: "Active", due: "Sep 1", c: "text-blue-400" },
      ].map((row, i) => (
        <div key={i} className="grid grid-cols-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
          <div className="px-3 py-2 text-white font-medium col-span-1 truncate">{row.title}</div>
          <div className="px-2 py-2 text-slate-400">{row.cat}</div>
          <div className={`px-2 py-2 ${row.c} font-semibold`}>{row.status}</div>
          <div className="px-2 py-2 text-slate-400">{row.due}</div>
        </div>
      ))}
      {/* Reminder indicator */}
      <div className="px-3 py-2 bg-amber-500/5 border-t border-amber-500/20 flex items-center gap-2">
        <Bell className="w-3 h-3 text-amber-400" />
        <span className="text-amber-400 text-[10px]">Reminder sent to owner@co.com · 3 days before deadline</span>
      </div>
    </div>
  );
}

/* ─────────────── Audit Stamp ─────────────── */
function AuditStamp({ action, who, when }: { action: string; who: string; when: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-800/50 last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-white text-xs font-medium">{action}</span>
        <span className="text-slate-500 text-xs"> · {who}</span>
      </div>
      <span className="text-slate-600 text-[10px] flex-shrink-0">{when}</span>
    </div>
  );
}

/* ─────────────── Section label ─────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      <div className="h-px w-8 bg-amber-500/40" />
      <span className="text-amber-500 text-xs font-bold uppercase tracking-[0.2em]">{children}</span>
      <div className="h-px w-8 bg-amber-500/40" />
    </div>
  );
}

/* ─────────────── Main Page ─────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080d1a] text-white overflow-x-hidden" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>

      {/* ── NAV ── */}
      <nav className="border-b border-white/8 sticky top-0 z-50 backdrop-blur-xl bg-[#080d1a]/85">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/40 relative">
              <RadarIcon className="w-4 h-4 text-slate-900" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">RiskRadar</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-slate-500">
            <a href="#problem" className="hover:text-white transition-colors">The Problem</a>
            <a href="#solution" className="hover:text-white transition-colors">Solution</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#trust" className="hover:text-white transition-colors">Trust</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/8" data-testid="link-sign-in">
                Sign in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold shadow-lg shadow-amber-500/25 rounded-lg" data-testid="link-sign-up">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        {/* Background atmosphere */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_top,_#f59e0b12_0%,_transparent_65%)]" />
          <div className="absolute top-1/4 right-8 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-12 w-96 h-64 bg-amber-500/4 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — headline */}
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-1.5 text-sm text-amber-400 font-semibold mb-8">
                <Zap className="w-3.5 h-3.5" />
                Built for operations teams at growing SMBs
              </div>
              <h1 className="text-5xl lg:text-6xl font-black leading-[1.04] tracking-tight mb-6">
                Your renewal
                <br />
                <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                  cockpit.
                </span>
                <br />
                <span className="text-slate-400 text-4xl lg:text-5xl font-bold">Not a spreadsheet.</span>
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg" style={{ fontFamily: "'Inter', sans-serif" }}>
                RiskRadar tracks every license, contract, insurance policy, and compliance deadline — then fires escalating reminders so your team never misses a renewal again.
              </p>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Link href="/sign-up">
                  <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black px-7 h-12 text-base gap-2 shadow-xl shadow-amber-500/25 rounded-xl" data-testid="button-hero-cta">
                    Launch your radar <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button size="lg" variant="outline" className="border-white/15 text-slate-300 hover:bg-white/8 hover:text-white rounded-xl h-12 px-6 text-base" data-testid="button-sign-in-alt">
                    Sign in
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-slate-600" style={{ fontFamily: "'Inter', sans-serif" }}>
                No credit card. Demo data loaded instantly.
              </p>

              {/* Mini trust badges */}
              <div className="flex items-center gap-5 mt-8">
                {[
                  { icon: ShieldCheck, label: "Audit trail" },
                  { icon: Bell, label: "Auto escalation" },
                  { icon: FileSpreadsheet, label: "CSV import" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Icon className="w-3.5 h-3.5 text-amber-500/70" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Radar SVG */}
            <div className="flex items-center justify-center">
              <div className="relative w-80 h-80 lg:w-96 lg:h-96">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_#f59e0b08_0%,_transparent_70%)]" />
                <RadarSweep />

                {/* Floating obligation callouts */}
                <div className="absolute top-6 right-0 translate-x-1/4 bg-slate-800/90 border border-amber-500/30 rounded-xl px-3 py-2 text-xs shadow-xl">
                  <p className="text-amber-400 font-bold">Business License</p>
                  <p className="text-slate-400">42 days · Licensing</p>
                </div>
                <div className="absolute bottom-10 left-0 -translate-x-1/4 bg-slate-800/90 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs shadow-xl">
                  <p className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> GL Insurance
                  </p>
                  <p className="text-slate-400">Renewed ✓</p>
                </div>
                <div className="absolute bottom-1/3 right-0 translate-x-1/3 bg-slate-800/90 border border-red-500/30 rounded-xl px-3 py-2 text-xs shadow-xl">
                  <p className="text-red-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> OSHA Cert
                  </p>
                  <p className="text-slate-400">3 days overdue</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAT BAR ── */}
      <div className="border-y border-white/8 bg-white/[0.015] py-6">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: "Hourly", l: "Reminder checks", icon: Clock },
            { v: "100%", l: "Audit trail coverage", icon: ClipboardCheck },
            { v: "Auto", l: "Escalation to backup", icon: TrendingUp },
            { v: "Instant", l: "CSV import wizard", icon: FileSpreadsheet },
          ].map(({ v, l, icon: Icon }) => (
            <div key={l} className="flex flex-col items-center gap-1.5">
              <Icon className="w-4 h-4 text-amber-500 mb-1" />
              <p className="text-2xl font-black text-white">{v}</p>
              <p className="text-xs text-slate-500" style={{ fontFamily: "'Inter', sans-serif" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── BEFORE / AFTER ── */}
      <section id="problem" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <SectionLabel>The problem you know</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              Spreadsheets weren't built
              <br />
              <span className="text-slate-500">for this kind of pressure.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            {/* Before */}
            <div className="rounded-2xl border border-red-900/30 bg-red-950/15 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
                </div>
                <div>
                  <p className="font-bold text-red-300 text-sm">Before RiskRadar</p>
                  <p className="text-xs text-red-400/60" style={{ fontFamily: "'Inter', sans-serif" }}>The spreadsheet graveyard</p>
                </div>
              </div>
              <SpreadsheetChaos />
              <div className="mt-5 space-y-2">
                {[
                  "Renewal date buried in a shared Drive sheet nobody updates",
                  "License expired while owner was on vacation",
                  "\"Whose job was this?\" conversation every quarter",
                  "No record of who changed what or when",
                ].map((pain) => (
                  <div key={pain} className="flex items-start gap-2.5 text-sm text-red-300/70" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500/60 flex-shrink-0 mt-0.5" />
                    {pain}
                  </div>
                ))}
              </div>
            </div>

            {/* After */}
            <div className="rounded-2xl border border-emerald-800/30 bg-emerald-950/10 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <RadarIcon className="w-4.5 h-4.5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-emerald-300 text-sm">After RiskRadar</p>
                  <p className="text-xs text-emerald-400/60" style={{ fontFamily: "'Inter', sans-serif" }}>Your live renewal cockpit</p>
                </div>
              </div>
              <CockpitMockup />
              <div className="mt-5 space-y-2">
                {[
                  "Every obligation tracked with owner, backup, and due date",
                  "Reminders fire automatically — days or weeks in advance",
                  "Backup owner escalated if primary misses the window",
                  "Full audit trail: who changed what, and exactly when",
                ].map((win) => (
                  <div key={win} className="flex items-start gap-2.5 text-sm text-emerald-300/70" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70 flex-shrink-0 mt-0.5" />
                    {win}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OBLIGATION FLOW CARDS ── */}
      <section id="solution" className="py-24 px-6 bg-white/[0.015] border-y border-white/8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <SectionLabel>The obligation lifecycle</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Every obligation has a path.
              <br />
              <span className="text-slate-400">We track all of it.</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
              From import to renewal confirmation, every obligation moves through a defined lifecycle with automatic state transitions and notifications.
            </p>
          </div>

          {/* Lifecycle flow */}
          <div className="relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { icon: Upload, label: "Import", desc: "CSV wizard maps your spreadsheet columns", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", num: "1" },
                { icon: ClipboardCheck, label: "Track", desc: "Active status, owner assigned, due date set", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", num: "2" },
                { icon: Bell, label: "Remind", desc: "Reminder fires N days before due date", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", num: "3" },
                { icon: TrendingUp, label: "Escalate", desc: "Backup owner notified if owner misses it", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", num: "4" },
                { icon: CheckCircle2, label: "Complete", desc: "Mark done, audit stamp recorded", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", num: "5" },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex flex-col items-center text-center">
                    <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center mb-4 ${step.bg} relative`}>
                      <Icon className={`w-7 h-7 ${step.color}`} />
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-400 flex items-center justify-center">
                        {step.num}
                      </span>
                    </div>
                    <p className={`font-bold text-sm mb-1.5 ${step.color}`}>{step.label}</p>
                    <p className="text-slate-500 text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Obligation cards grid */}
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ObligationCard title="Business License" category="Licensing" status="Active" days="42 days remaining" color="border-blue-900/30" />
            <ObligationCard title="General Liability" category="Insurance" status="Due Soon" days="6 days remaining" color="border-amber-900/30" />
            <ObligationCard title="OSHA Certification" category="Compliance" status="Overdue" days="3 days overdue" color="border-red-900/30" />
            <ObligationCard title="SaaS Agreement" category="Contracts" status="Completed" days="Renewed Apr 28" color="border-emerald-900/30" />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <SectionLabel>Get started in minutes</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              Three steps to
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">full obligation clarity.</span>
            </h2>
          </div>

          <div className="space-y-5">
            {[
              {
                num: "01",
                title: "Import your obligations",
                desc: "Paste a CSV or add obligations one by one. The guided column-mapping wizard handles messy spreadsheets — match your headers to our fields in under a minute.",
                icon: FileSpreadsheet,
                accent: "border-blue-500/30 bg-blue-500/5",
                tag: "CSV Import Wizard",
                tagColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
              },
              {
                num: "02",
                title: "Set reminder rules per obligation",
                desc: "Define how many days before a deadline to notify the owner — or the backup owner automatically if they miss it. Rules fire on the hour, every hour.",
                icon: Bell,
                accent: "border-amber-500/30 bg-amber-500/5",
                tag: "Auto Escalation",
                tagColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
              },
              {
                num: "03",
                title: "Watch the cockpit run itself",
                desc: "The dashboard shows active, overdue, due-soon, and completed counts. Every action — edit, complete, import, escalation — is stamped in the audit log with actor and timestamp.",
                icon: RadarIcon,
                accent: "border-emerald-500/30 bg-emerald-500/5",
                tag: "Full Audit Trail",
                tagColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className={`rounded-2xl border ${step.accent} p-8 flex items-start gap-8`}>
                  <div className="flex-shrink-0 text-5xl font-black text-white/10 w-16 text-right leading-none pt-1">
                    {step.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-xl font-bold text-white">{step.title}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${step.tagColor}`}>
                        {step.tag}
                      </span>
                    </div>
                    <p className="text-slate-400 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>{step.desc}</p>
                  </div>
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hidden md:flex">
                    <Icon className="w-5 h-5 text-white/40" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── RISK OVERVIEW + RENEWAL RINGS ── */}
      <section className="py-24 px-6 bg-white/[0.015] border-y border-white/8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — radar rings panel */}
            <div>
              <SectionLabel>Always-on visibility</SectionLabel>
              <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">
                Your obligation
                <br />health at a glance.
              </h2>
              <p className="text-slate-400 mb-10 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                Color-coded rings show how much runway each obligation has. Overdue is red. Due soon is amber. Safe is green. You know exactly where to focus.
              </p>
              <div className="flex items-center gap-8 flex-wrap">
                <RenewalRing pct={85} color="#3b82f6" label="Business License" days="42d" />
                <RenewalRing pct={20} color="#f59e0b" label="Domain Renewal" days="6d" />
                <RenewalRing pct={0} color="#ef4444" label="OSHA Cert" days="Late" />
                <RenewalRing pct={100} color="#10b981" label="GL Insurance" days="Done" />
                <RenewalRing pct={65} color="#8b5cf6" label="Vendor SLA" days="28d" />
              </div>
            </div>

            {/* Right — audit trail panel */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2.5">
                <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="font-bold text-sm text-slate-200">Audit Trail</span>
                <span className="ml-auto text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Live</span>
              </div>
              <div className="p-5">
                <AuditStamp action="Business License marked complete" who="sarah@co.com" when="2m ago" />
                <AuditStamp action="Reminder rule added (7 days)" who="ops@co.com" when="14m ago" />
                <AuditStamp action="OSHA Cert due date updated" who="james@co.com" when="1h ago" />
                <AuditStamp action="Domain Renewal — reminder sent" who="System" when="3h ago" />
                <AuditStamp action="GL Insurance imported via CSV" who="ops@co.com" when="Yesterday" />
                <AuditStamp action="Worker's comp owner reassigned" who="admin@co.com" when="2d ago" />
              </div>
              <div className="px-5 pb-4">
                <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3 text-center">
                  <p className="text-xs text-slate-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Every action is immutable and timestamped.
                    <span className="text-slate-400 font-medium"> Perfect for compliance audits.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel>What's included</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              Everything you need.
              <br />
              <span className="text-slate-500">Nothing you don't.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: RadarIcon, title: "Operations dashboard", desc: "6 metric cards — Active, Overdue, Due Soon, Completed, Expired, Reminders sent. Category breakdown and upcoming obligations table.", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
              { icon: Bell, title: "Escalating reminders", desc: "Configurable rules: notify the owner N days before. If they miss it, fire again to the backup owner. Runs every hour automatically.", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
              { icon: FileSpreadsheet, title: "CSV import wizard", desc: "4-step: upload/paste → column mapping → row preview → confirm. Handles any column order or naming convention.", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
              { icon: Download, title: "CSV export", desc: "One-click export of all your obligations with current status, owner, due date, and notes. Ready for reporting or backup.", color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
              { icon: ClipboardCheck, title: "Immutable audit log", desc: "Every create, edit, complete, delete, and import is stamped with actor, timestamp, and the full obligation record.", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
              { icon: Users, title: "Team workspaces", desc: "Invite team members by email. Assign owners and backup owners per obligation. Role-based access with owner, admin, and member levels.", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="group rounded-2xl border border-white/8 bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/15 transition-all duration-200 hover:-translate-y-0.5">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${f.color}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-bold text-white text-base mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TRUST PANEL ── */}
      <section id="trust" className="py-24 px-6 bg-white/[0.015] border-y border-white/8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel>Built for trust</SectionLabel>
            <h2 className="text-4xl font-black tracking-tight">
              Compliance confidence,
              <br />
              <span className="text-slate-400">baked in from day one.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Lock,
                title: "Secure auth",
                points: ["Google & email sign-in via Clerk", "Role-based workspace membership", "Session-secured API endpoints"],
                color: "border-blue-500/20 bg-blue-500/5",
                iconBg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
              },
              {
                icon: ClipboardCheck,
                title: "Audit-ready trail",
                points: ["Every action immutably logged", "Actor, timestamp, obligation state", "Export-ready for compliance reviews"],
                color: "border-emerald-500/20 bg-emerald-500/5",
                iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              },
              {
                icon: RefreshCw,
                title: "Automated reliability",
                points: ["Hourly reminder processor", "Automatic expiry state transitions", "Delivery history for every send"],
                color: "border-amber-500/20 bg-amber-500/5",
                iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
              },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.title} className={`rounded-2xl border p-6 ${t.color}`}>
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-5 ${t.iconBg}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-bold text-white text-lg mb-3">{t.title}</h3>
                  <ul className="space-y-2">
                    {t.points.map((p) => (
                      <li key={p} className="flex items-center gap-2.5 text-sm text-slate-400" style={{ fontFamily: "'Inter', sans-serif" }}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel>From the field</SectionLabel>
            <h2 className="text-4xl font-black tracking-tight">Teams that stopped panicking.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { quote: "We had 40+ licenses across 3 states. Two expired before we found RiskRadar. Haven't missed one since.", author: "Sarah M.", role: "Operations Director, Regional Retailer" },
              { quote: "The CSV import wizard saved our team days of data entry. Mapped 200 obligations in about 10 minutes.", author: "James T.", role: "Compliance Lead, Property Management Co." },
              { quote: "Finally a tool that doesn't assume we have a compliance department. Built for how we actually work.", author: "Dana K.", role: "COO, Logistics Startup" },
            ].map((t) => (
              <div key={t.author} className="rounded-2xl border border-white/8 bg-white/[0.02] p-7 flex flex-col">
                <div className="flex gap-0.5 mb-5">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-sm">★</span>)}
                </div>
                <p className="text-slate-300 leading-relaxed italic flex-1 mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {t.author[0]}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.author}</p>
                    <p className="text-slate-500 text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[radial-gradient(ellipse_at_center,_#f59e0b0d_0%,_transparent_65%)]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <RadarSweep />
          </div>
          <h2 className="text-5xl md:text-6xl font-black mb-5 tracking-tight leading-[1.05]">
            Launch your
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
              renewal radar.
            </span>
          </h2>
          <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            Sign up, get demo data instantly, and see exactly how RiskRadar would look for your operations team — before you import a single obligation.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black px-12 h-14 text-lg gap-2 shadow-2xl shadow-amber-500/25 rounded-xl" data-testid="button-bottom-cta">
              Start tracking for free <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-slate-600 text-sm mt-5" style={{ fontFamily: "'Inter', sans-serif" }}>No credit card. Cancel anytime.</p>

          {/* Trust signals row */}
          <div className="flex items-center justify-center gap-8 mt-12 flex-wrap">
            {[
              { icon: Lock, label: "Clerk auth" },
              { icon: ShieldCheck, label: "Full audit trail" },
              { icon: Bell, label: "Hourly reminders" },
              { icon: Users, label: "Team workspaces" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-slate-600">
                <Icon className="w-3.5 h-3.5 text-slate-500" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/8 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
              <RadarIcon className="w-3.5 h-3.5 text-slate-900" />
            </div>
            <span className="font-bold text-white text-sm">RiskRadar</span>
          </div>
          <div className="flex items-center gap-7 text-sm text-slate-500">
            <Link href="/sign-in"><span className="hover:text-white transition-colors cursor-pointer">Sign in</span></Link>
            <Link href="/sign-up"><span className="hover:text-white transition-colors cursor-pointer">Get started</span></Link>
          </div>
          <p className="text-xs text-slate-700" style={{ fontFamily: "'Inter', sans-serif" }}>
            Built for SMBs that take compliance seriously.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Fix missing import
function Download({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
