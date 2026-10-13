export enum NotificationSeverity {
  CRITICAL = "Critical",
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
}

export enum NotificationStatus {
  OPEN = "Open",
  ACKNOWLEDGED = "Acknowledged",
  RESOLVED = "Resolved",
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  severity: NotificationSeverity;
  source: string;
  agent: string;
  timestamp: string;
  status: NotificationStatus;
  recommendedAction: string;
}