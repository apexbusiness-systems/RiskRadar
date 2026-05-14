import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  LayoutDashboard,
  ClipboardList,
  Upload,
  Bell,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  RadarIcon,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/obligations", label: "Obligations", icon: ClipboardList },
      { href: "/import", label: "CSV Import", icon: Upload },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/delivery", label: "Delivery History", icon: Bell },
      { href: "/audit", label: "Audit Log", icon: BookOpen },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/workspace", label: "Workspace", icon: Settings },
    ],
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ?? "U";

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : user?.emailAddresses[0]?.emailAddress ?? "";

  const email = user?.emailAddresses[0]?.emailAddress ?? "";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-30 w-60 bg-[#0f172a] text-white flex flex-col transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
            <RadarIcon className="w-4 h-4 text-slate-900" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-white leading-tight">DueRadar</p>
            <p className="text-xs text-white/40 leading-tight mt-0.5 truncate">Deadline Tracker</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5">
                {section.label}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/obligations"
                    ? location.startsWith("/obligations")
                    : location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer mb-0.5 relative",
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/50 hover:bg-white/[0.06] hover:text-white/80",
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-full" />
                      )}
                      <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-amber-400" : "")} />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight className="w-3 h-3 text-white/30" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.06] transition-colors group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-900 text-xs font-black flex-shrink-0 shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">{displayName}</p>
              <p className="text-[10px] text-white/40 truncate leading-tight mt-0.5">{email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-white/30 hover:text-red-400 hover:bg-red-400/10 flex-shrink-0 transition-colors"
              onClick={() => signOut()}
              data-testid="button-sign-out"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-white shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            data-testid="button-mobile-menu"
            className="text-slate-600"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center">
              <RadarIcon className="w-3 h-3 text-slate-900" />
            </div>
            <span className="font-bold text-sm text-slate-900">DueRadar</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
