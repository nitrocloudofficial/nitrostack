'use client';

import DashboardCard from "../cards/DashboardCard";
import { dashboardData } from "../../lib/dashboard";

import {
  FaShieldAlt,
  FaCheckCircle,
  FaRobot,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function MetricsGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
        gap: 20,
        marginTop: 30,
      }}
    >
      <DashboardCard
        title="Security Score"
        value={`${dashboardData.securityScore}%`}
        icon={<FaShieldAlt />}
        color="#10B981"
      />

      <DashboardCard
        title="Compliance"
        value={`${dashboardData.compliance}%`}
        icon={<FaCheckCircle />}
        color="#3B82F6"
      />

      <DashboardCard
        title="Protected Agents"
        value={dashboardData.protectedAgents.toString()}
        icon={<FaRobot />}
        color="#8B5CF6"
      />

      <DashboardCard
        title="Critical Alerts"
        value={dashboardData.criticalAlerts.toString()}
        icon={<FaExclamationTriangle />}
        color="#EF4444"
      />
    </div>
  );
}