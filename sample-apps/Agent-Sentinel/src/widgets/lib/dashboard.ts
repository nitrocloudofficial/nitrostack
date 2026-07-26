export interface DashboardData {
  securityScore: number;
  compliance: number;
  protectedAgents: number;
  criticalAlerts: number;

  agents: {
    name: string;
    health: number;
    status: string;
  }[];

  connectors: {
    name: string;
    status: string;
  }[];

  notifications: {
    title: string;
    severity: string;
    time: string;
  }[];
}

export const dashboardData: DashboardData = {
  securityScore: 94,
  compliance: 96,
  protectedAgents: 18,
  criticalAlerts: 2,

  agents: [
    {
      name: "Security Agent",
      health: 98,
      status: "Healthy",
    },
    {
      name: "Finance Agent",
      health: 92,
      status: "Healthy",
    },
    {
      name: "HR Agent",
      health: 84,
      status: "Warning",
    },
    {
      name: "Support Agent",
      health: 71,
      status: "Critical",
    },
  ],

  connectors: [
    {
      name: "GitHub",
      status: "Healthy",
    },
    {
      name: "Gmail",
      status: "Healthy",
    },
    {
      name: "Discord",
      status: "Healthy",
    },
    {
      name: "Calendar",
      status: "Warning",
    },
  ],

  notifications: [
    {
      title: "GitHub Secret Detected",
      severity: "Critical",
      time: "2 min ago",
    },
    {
      title: "Prompt Injection Blocked",
      severity: "High",
      time: "8 min ago",
    },
  ],
};