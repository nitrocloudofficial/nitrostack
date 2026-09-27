"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Activity,
  Cpu,
  LayoutDashboard,
  Radar,
  Shield,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/devices", label: "Devices", icon: Cpu },
  { path: "/monitoring", label: "Monitoring", icon: Activity },
  { path: "/guardian-ai", label: "Guardian AI", icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();

  const linkClass = (path: string, active: boolean) =>
    `flex items-center gap-3 rounded-lg p-2.5 text-sm font-medium transition ${
      active
        ? "bg-primary/15 text-primary"
        : "text-sidebar-muted hover:bg-muted hover:text-sidebar-foreground"
    }`;

  return (
    <aside className="z-20 flex h-16 w-full shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 sm:h-auto sm:min-h-screen sm:w-64 sm:flex-col sm:items-stretch sm:border-b-0 sm:border-r sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Radar size={20} />
        </span>
        <span className="hidden text-lg font-bold text-sidebar-foreground sm:block">
          GuardianSense
        </span>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex items-center gap-1 sm:mt-10 sm:flex-1 sm:flex-col sm:items-stretch sm:gap-2"
      >
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              href={path}
              aria-current={active ? "page" : undefined}
              title={label}
              className={linkClass(path, active)}
            >
              <Icon size={20} className="shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden text-xs text-sidebar-muted sm:block">
        v0.1.0 · CSI Monitoring
      </div>
    </aside>
  );
}
