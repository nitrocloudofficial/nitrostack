"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "⚡" },
  { href: "/dashboard/appointments", label: "Appointments", icon: "📅" },
  { href: "/dashboard/health-records", label: "Health Records", icon: "📋" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-gradient-orb bg-gradient-orb-1" aria-hidden="true" />
      <div className="bg-gradient-orb bg-gradient-orb-2" aria-hidden="true" />
      <div className="bg-gradient-orb bg-gradient-orb-3" aria-hidden="true" />

      <div className="app-wrapper">
        <header className="header" role="banner">
          <div className="header-brand">
            <div className="header-logo" aria-hidden="true">🏥</div>
            <div>
              <div className="header-title">Ashwemedha.exe</div>
              <div className="header-subtitle">Health Portal</div>
            </div>
          </div>

          <nav className="dashboard-nav" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`dashboard-nav-link ${pathname === item.href ? "active" : ""}`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-status" aria-live="polite">
            <span className="status-dot active" />
            System Online
          </div>
        </header>

        <main className="main-content" id="main-content">
          {children}
        </main>
      </div>
    </>
  );
}
