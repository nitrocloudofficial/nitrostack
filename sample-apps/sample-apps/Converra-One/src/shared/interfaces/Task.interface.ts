import { PriorityLevel } from '../enums/priority.enum.js';
import { TaskStatus } from '../enums/task.enum.js';
import { PlatformType } from '../enums/platform.enum.js';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: PriorityLevel;
  sourcePlatform?: PlatformType;
  sourceMessageId?: string;
  sourceConversationId?: string;
  assignee?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}
