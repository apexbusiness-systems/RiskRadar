import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { RadarIcon, ShieldCheck, Bell, FileSpreadsheet, Users, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Never Miss a Deadline",
    desc: "Track licenses, contracts, insurance, and every other recurring obligation in one place.",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    desc: "Configurable reminder rules fire days or weeks before due dates. Escalate to backup owners automatically.",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV Import & Export",
    desc: "Bring your existing obligations from a spreadsheet with a guided column-mapping wizard.",
  },
  {
    icon: Users,
    title: "Team Workspaces",
    desc: "Invite your team, assign obligation owners, and maintain a full audit trail of every change.",
  },
];

const CATEGORIES = [
  "Business Licenses",
  "Insurance Policies",
  "Vendor Contracts",
  "Domain & Software",
  "Regulatory Compliance",
  "HR & Employment",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <RadarIcon className="w-4 h-4 text-slate-900" />
            </div>
            <span className="font-bold text-slate-900">Renewal Radar</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" data-testid="link-sign-in">
                Sign in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="link-sign-up">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 text-sm text-amber-800 font-medium mb-8">
          <RadarIcon className="w-3.5 h-3.5" />
          Stop letting deadlines slip through the cracks
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6 max-w-3xl mx-auto">
          Every business obligation,
          <br />
          <span className="text-amber-500">tracked automatically.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Renewal Radar keeps your licenses, insurance, contracts, and compliance
          deadlines organized — with reminders that escalate before anything expires.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/sign-up">
            <Button
              size="lg"
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 gap-2"
              data-testid="button-hero-cta"
            >
              Start tracking for free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="outline" size="lg" className="px-8" data-testid="button-sign-in-alt">
              Sign in
            </Button>
          </Link>
        </div>
        <p className="text-sm text-slate-400 mt-4">
          No credit card required. Demo data included.
        </p>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-200 bg-white py-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "100%", label: "Deadline coverage" },
            { value: "Hourly", label: "Reminder checks" },
            { value: "Auto", label: "Escalation to backup" },
            { value: "Full", label: "Audit trail" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-3">
          Everything you need to stay compliant
        </h2>
        <p className="text-slate-500 text-center mb-12 max-w-xl mx-auto">
          Built for the operations team at a growing SMB — not an enterprise compliance department.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Track any type of obligation
          </h2>
          <p className="text-slate-400 mb-10">
            From annual licenses to quarterly compliance reviews.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {CATEGORIES.map((c) => (
              <span
                key={c}
                className="bg-slate-800 border border-slate-700 text-slate-300 rounded-full px-4 py-1.5 text-sm"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to stop worrying about renewals?</h2>
        <p className="text-slate-500 mb-8">
          Sign up and your demo data is seeded automatically. See it in action in seconds.
        </p>
        <Link href="/sign-up">
          <Button
            size="lg"
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-10 gap-2"
            data-testid="button-bottom-cta"
          >
            Get started free
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center">
              <RadarIcon className="w-3 h-3 text-slate-900" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Renewal Radar</span>
          </div>
          <p className="text-xs text-slate-400">
            Built for small businesses that take compliance seriously.
          </p>
        </div>
      </footer>
    </div>
  );
}
