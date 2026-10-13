export type NotificationSource = 'slack' | 'jira' | 'github' | 'gmail' | 'calendar' | 'pagerduty';

export interface Notification {
  id: string;
  source: NotificationSource;
  sender: string;
  title: string;
  snippet: string;
  timestamp: string; // ISO 8601 string or equivalent
  link: string;
  accountId: string;
  accountEmail: string | null;
  rawMetadata?: Record<string, any>;
}
