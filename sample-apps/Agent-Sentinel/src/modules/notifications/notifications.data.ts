import {
  Notification,
  NotificationSeverity,
  NotificationStatus,
} from "./notifications.types.js";

export const notifications: Notification[] = [
  {
    id: "NOT-001",
    title: "GitHub Secret Detected",
    description: "Potential API key detected inside repository.",
    severity: NotificationSeverity.CRITICAL,
    source: "GitHub",
    agent: "Security Agent",
    timestamp: new Date().toISOString(),
    status: NotificationStatus.OPEN,
    recommendedAction: "Rotate exposed credentials immediately.",
  },
  {
    id: "NOT-002",
    title: "Policy Violation",
    description: "Finance Agent attempted an unauthorized action.",
    severity: NotificationSeverity.HIGH,
    source: "Policy",
    agent: "Finance Agent",
    timestamp: new Date().toISOString(),
    status: NotificationStatus.ACKNOWLEDGED,
    recommendedAction: "Review and update policy permissions.",
  },
  {
    id: "NOT-003",
    title: "Connector Offline",
    description: "Discord connector is temporarily unavailable.",
    severity: NotificationSeverity.MEDIUM,
    source: "Connectors",
    agent: "System",
    timestamp: new Date().toISOString(),
    status: NotificationStatus.OPEN,
    recommendedAction: "Verify connector credentials and network.",
  },
];