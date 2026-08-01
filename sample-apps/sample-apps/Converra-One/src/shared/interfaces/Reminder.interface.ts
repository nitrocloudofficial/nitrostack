import { PriorityLevel } from '../enums/priority.enum.js';

export interface Reminder {
  id: string;
  title: string;
  note?: string;
  remindAt: Date;
  isDismissed: boolean;
  priority: PriorityLevel;
  referenceId?: string; // Links to Message or Task
  referenceType?: 'message' | 'task' | 'calendar';
  createdAt: Date;
}
