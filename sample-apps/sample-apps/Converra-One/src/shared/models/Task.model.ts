import { Task } from '../interfaces/Task.interface.js';
import { PriorityLevel } from '../enums/priority.enum.js';
import { TaskStatus } from '../enums/task.enum.js';
import { PlatformType } from '../enums/platform.enum.js';

export class TaskModel implements Task {
  public id: string;
  public title: string;
  public description?: string;
  public status: TaskStatus;
  public priority: PriorityLevel;
  public sourcePlatform?: PlatformType;
  public sourceMessageId?: string;
  public sourceConversationId?: string;
  public assignee?: string;
  public dueDate?: Date;
  public createdAt: Date;
  public updatedAt: Date;
  public tags?: string[];

  constructor(data: Task) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.status = data.status;
    this.priority = data.priority;
    this.sourcePlatform = data.sourcePlatform;
    this.sourceMessageId = data.sourceMessageId;
    this.sourceConversationId = data.sourceConversationId;
    this.assignee = data.assignee;
    this.dueDate = data.dueDate;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.tags = data.tags || [];
  }
}
