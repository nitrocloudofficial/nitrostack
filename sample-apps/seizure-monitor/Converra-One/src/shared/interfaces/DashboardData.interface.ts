import { Message } from './Message.interface.js';
import { Task } from './Task.interface.js';
import { CalendarEvent } from './CalendarEvent.interface.js';
import { Notification } from './Notification.interface.js';

export interface DashboardMetrics {
  totalUnreadMessages: number;
  urgentMessagesCount: number;
  pendingTasksCount: number;
  upcomingEventsCount: number;
  commitmentsCount: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentMessages: Message[];
  priorityTasks: Task[];
  todaysEvents: CalendarEvent[];
  unreadNotifications: Notification[];
  lastRefreshedAt: Date;
}
