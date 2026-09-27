'use client';

import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  color: string;
  icon: ReactNode;
}

export default function DashboardCard({
  title,
  value,
  color,
  icon,
}: DashboardCardProps) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #1F2937",
        borderRadius: 16,
        padding: 24,
        transition: "0.3s",
      }}
    >
      <div
        style={{
          color,
          fontSize: 34,
          marginBottom: 18,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: "#9CA3AF",
          fontSize: 14,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#F9FAFB",
          fontSize: 36,
          fontWeight: 700,
          marginTop: 12,
        }}
      >
        {value}
      </div>
    </div>
  );
}