import { DashboardData, DashboardMetrics } from '../interfaces/DashboardData.interface.js';
import { Message } from '../interfaces/Message.interface.js';
import { Task } from '../interfaces/Task.interface.js';
import { CalendarEvent } from '../interfaces/CalendarEvent.interface.js';
import { Notification } from '../interfaces/Notification.interface.js';

export class DashboardModel implements DashboardData {
  public metrics: DashboardMetrics;
  public recentMessages: Message[];
  public priorityTasks: Task[];
  public todaysEvents: CalendarEvent[];
  public unreadNotifications: Notification[];
  public lastRefreshedAt: Date;

  constructor(data?: Partial<DashboardData>) {
    this.metrics = data?.metrics || {
      totalUnreadMessages: 0,
      urgentMessagesCount: 0,
      pendingTasksCount: 0,
      upcomingEventsCount: 0,
      commitmentsCount: 0
    };
    this.recentMessages = data?.recentMessages || [];
    this.priorityTasks = data?.priorityTasks || [];
    this.todaysEvents = data?.todaysEvents || [];
    this.unreadNotifications = data?.unreadNotifications || [];
    this.lastRefreshedAt = data?.lastRefreshedAt || new Date();
  }
}
