import { taskRepository } from './repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { eventBus } from '../../infrastructure/eventBus/index.js';

export class TaskService {
  async getTasks(projectId?: string, assigneeId?: string) {
    return taskRepository.findAll(projectId, assigneeId);
  }

  async getTaskById(id: string) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    return task;
  }

  async createTask(creatorId: string, data: {
    projectId: string;
    assigneeId?: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    complexity?: number;
    estimatedHours?: number;
    dueDate?: Date;
    labels?: string[];
    tags?: string[];
  }) {
    let riskScore = 10;
    if (data.priority === 'CRITICAL' || data.priority === 'URGENT') riskScore += 30;
    if ((data.complexity || 3) >= 4) riskScore += 20;

    const task = await taskRepository.create({
      projectId: data.projectId,
      assigneeId: data.assigneeId,
      creatorId,
      title: data.title,
      description: data.description,
      priority: data.priority || TaskPriority.MEDIUM,
      complexity: data.complexity || 3,
      estimatedHours: data.estimatedHours || 2.0,
      dueDate: data.dueDate,
      labels: data.labels || [],
      tags: data.tags || [],
      riskScore,
      aiSummary: `Task '${data.title}' initialized with priority ${data.priority || 'MEDIUM'} and estimated workload ${data.estimatedHours || 2} hours.`,
    });

    eventBus.publish('TaskCreated', { taskId: task.id, projectId: task.projectId });
    return task;
  }

  async updateTask(taskId: string, userId: string, data: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    actualHours?: number;
    riskScore?: number;
  }) {
    const oldTask = await this.getTaskById(taskId);

    const updated = await taskRepository.update(taskId, data);

    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && (oldTask as any)[key] !== val) {
        await taskRepository.createHistory(
          taskId,
          userId,
          key,
          String((oldTask as any)[key] ?? ''),
          String(val)
        );
      }
    }

    if (data.status === 'DONE') {
      eventBus.publish('TaskCompleted', { taskId, projectId: updated.projectId });
    } else {
      eventBus.publish('TaskUpdated', { taskId, projectId: updated.projectId });
    }

    return updated;
  }

  async addDependency(blockedTaskId: string, dependentOnId: string) {
    const dep = await taskRepository.addDependency(blockedTaskId, dependentOnId);
    await taskRepository.update(blockedTaskId, {
      status: TaskStatus.BLOCKED,
      riskScore: 75,
    });
    return dep;
  }
}

export const taskService = new TaskService();
