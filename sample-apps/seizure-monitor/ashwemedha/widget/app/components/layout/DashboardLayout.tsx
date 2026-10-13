"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Health Records", href: "/dashboard/health-records", icon: "📋" },
  { label: "Appointments", href: "/dashboard/appointments", icon: "📅" },
  { label: "Risk Analysis", href: "/dashboard/risk-analysis", icon: "⚠️" },
  { label: "Patients", href: "/dashboard/patients", icon: "👥" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-gradient-orb bg-gradient-orb-1" aria-hidden="true" />
      <div className="bg-gradient-orb bg-gradient-orb-2" aria-hidden="true" />
      <div className="bg-gradient-orb bg-gradient-orb-3" aria-hidden="true" />

      <div className="app-wrapper" style={{ display: "flex", minHeight: "100vh" }}>
        <aside
          style={{
            width: sidebarOpen ? "240px" : "64px",
            flexShrink: 0,
            background: "var(--bg-card)",
            borderRight: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            transition: "width 0.3s ease",
            overflow: "hidden",
            position: "sticky",
            top: 0,
            height: "100vh",
          }}
        >
          <div
            style={{
              padding: "20px 16px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div className="header-logo" aria-hidden="true" style={{ width: 32, height: 32, fontSize: 16 }}>
              ⚕️
            </div>
            {sidebarOpen && (
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Ashwemedha
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  Health Portal
                </div>
              </div>
            )}
          </div>

          <nav style={{ padding: "12px 8px", flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "var(--scout-primary)" : "var(--text-secondary)",
                    background: isActive ? "var(--scout-glow)" : "transparent",
                    textDecoration: "none",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
                  {sidebarOpen && item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              margin: "12px 8px",
              padding: "8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "12px",
              textAlign: "center",
              transition: "all 0.2s",
            }}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <header
            style={{
              padding: "16px 32px",
              borderBottom: "1px solid var(--border-subtle)",
              background: "rgba(8,12,20,0.8)",
              backdropFilter: "blur(20px)",
              position: "sticky",
              top: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              Ashwemedha.exe — Patient Health Records
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="status-dot active" />
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                System Online
              </span>
            </div>
          </header>

          <main style={{ flex: 1, padding: "32px", maxWidth: "1400px", width: "100%", margin: "0 auto" }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
