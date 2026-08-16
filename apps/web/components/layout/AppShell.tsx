"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  FlaskConical,
  LayoutDashboard,
  Loader2,
  Menu,
  Network,
  RefreshCw,
  Settings,
  Target,
  X,
} from "lucide-react";
import Onboarding from "@/components/onboarding/Onboarding";
import Button from "@/components/ui/Button";
import API from "@/lib/services";
import { useBusiness } from "@/lib/business-context";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/team", label: "AI Team", icon: Network },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/research", label: "Research", icon: FlaskConical },
  { href: "/activity", label: "Live Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SidebarContent({
  pathname,
  businessName,
  degraded = false,
  onNavigate,
}: {
  pathname: string;
  businessName: string;
  degraded?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="side-brand">
        <div className="side-mark">
          <Network size={17} strokeWidth={2.2} />
        </div>
        <div className="side-name">
          VenturePilot
          <small>AI Operating System</small>
        </div>
      </div>

      <nav className="side-nav" aria-label="Primary">
        <p className="side-label">Command</p>
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`side-item${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {active && <motion.span layoutId="side-active" className="side-active-bar" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="side-status">
        <div className="side-status-row">
          <span className="status-dot live" style={{ ["--status" as string]: degraded ? "var(--gold)" : "var(--emerald)" }} />
          <div>
            <b>{degraded ? "Core offline · demo data" : "System online"}</b>
            <div style={{ color: "var(--text-3)", fontSize: 11.5 }}>6 agents · 2 missions active</div>
          </div>
        </div>
      </div>

      <div className="side-user">
        <div className="side-avatar">A</div>
        <div>
          <div className="side-user-name">Alex Morgan</div>
          <div className="side-user-role">Founder · {businessName}</div>
        </div>
      </div>
    </>
  );
}

function ShellLoading() {
  return (
    <div className="shell-state">
      <div className="onboarding-mark">
        <Network size={20} strokeWidth={2} aria-hidden />
      </div>
      <Loader2 size={18} className="spin" aria-hidden />
      <p>Connecting to VenturePilot Core…</p>
    </div>
  );
}

function ShellError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="shell-state">
      <div className="onboarding-mark">
        <Network size={20} strokeWidth={2} aria-hidden />
      </div>
      <h2>Unable to connect to VenturePilot Core</h2>
      <p>{message}</p>
      <Button variant="primary" onClick={onRetry}>
        <RefreshCw size={14} /> Retry
      </Button>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const { business, status, error, refresh } = useBusiness();

  // If the core is unreachable, services degrade to labeled demo data. Surface
  // that honestly in the shell instead of implying every number is live.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (API.isDegraded()) {
        setDegraded(true);
        window.clearInterval(id);
      }
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  if (status === "loading") return <ShellLoading />;
  if (status === "error") return <ShellError message={error ?? "Something went wrong."} onRetry={() => void refresh()} />;
  if (!business) return <Onboarding />;

  const businessName = business.name || "Your business";

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" aria-label="Open navigation" onClick={() => setOpen(true)}>
          <Menu size={18} />
        </button>
        <div className="side-brand" style={{ padding: 0 }}>
          <div className="side-mark" style={{ width: 28, height: 28 }}>
            <Network size={15} strokeWidth={2.2} />
          </div>
          <div className="side-name" style={{ fontSize: 14 }}>VenturePilot</div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              className="side-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              key="drawer"
              className="sidebar open"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <button className="icon-btn" aria-label="Close navigation" onClick={() => setOpen(false)} style={{ position: "absolute", top: 18, right: 14 }}>
                <X size={16} />
              </button>
              <SidebarContent pathname={pathname} businessName={businessName} degraded={degraded} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className="sidebar" aria-label="Sidebar">
        <SidebarContent pathname={pathname} businessName={businessName} degraded={degraded} />
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
