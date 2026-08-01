export type TaskStatus = 'pending' | 'completed' | 'rescheduled';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskDocument {
  userId: string;
  title: string;
  description?: string;
  category?: string;
  startTime?: string;
  endTime?: string;
  status: TaskStatus;
  priority: TaskPriority;
  googleCalendarEventId?: string;
  isTimeBlocked: boolean;
}

export class TaskModel {
  static create(task: Partial<TaskDocument>): TaskDocument {
    return {
      userId: task.userId ?? 'demo-user',
      title: task.title ?? 'Untitled task',
      description: task.description,
      category: task.category,
      startTime: task.startTime,
      endTime: task.endTime,
      status: task.status ?? 'pending',
      priority: task.priority ?? 'medium',
      googleCalendarEventId: task.googleCalendarEventId,
      isTimeBlocked: task.isTimeBlocked ?? false
    } as TaskDocument;
  }
}
