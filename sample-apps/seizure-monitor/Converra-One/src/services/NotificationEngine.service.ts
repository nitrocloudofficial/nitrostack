export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'urgent' | 'meeting' | 'task' | 'connector' | 'auth';
  timestamp: Date;
  isRead: boolean;
}

export class NotificationEngineService {
  private static instance: NotificationEngineService;
  private notifications: NotificationItem[];

  constructor() {
    this.notifications = [];
    this.initializeDefaultAlerts();
  }

  public static getInstance(): NotificationEngineService {
    if (!NotificationEngineService.instance) {
      NotificationEngineService.instance = new NotificationEngineService();
    }
    return NotificationEngineService.instance;
  }

  private initializeDefaultAlerts(): void {
    this.notifications = [
      {
        id: 'notif-01',
        title: 'Urgent Message Received',
        message: 'Dr. Evelyn Vance sent urgent project architecture feedback.',
        type: 'urgent',
        timestamp: new Date(),
        isRead: false
      },
      {
        id: 'notif-02',
        title: 'Upcoming Meeting Reminder',
        message: 'CS340 Review Call starting in 15 minutes.',
        type: 'meeting',
        timestamp: new Date(),
        isRead: false
      }
    ];
  }

  public getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  public addNotification(item: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>): void {
    this.notifications.unshift({
      ...item,
      id: `notif-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      isRead: false
    });
  }

  public markAsRead(id: string): void {
    const item = this.notifications.find(n => n.id === id);
    if (item) item.isRead = true;
  }
}
