import { prisma } from '../../config/database.js';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class TaskRepository {
  async findAll(projectId?: string, assigneeId?: string) {
    return prisma.task.findMany({
      where: {
        ...(projectId && { projectId }),
        ...(assigneeId && { assigneeId }),
        deletedAt: null,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, key: true } },
        blockedBy: { include: { dependentOn: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.task.findUnique({
      where: { id },
      include: {
        assignee: true,
        creator: true,
        project: true,
        history: { orderBy: { createdAt: 'desc' } },
        blockedBy: { include: { dependentOn: true } },
        blocking: { include: { blockedTask: true } },
      },
    });
  }

  async create(data: {
    projectId: string;
    assigneeId?: string;
    creatorId: string;
    title: string;
    description?: string;
    priority: TaskPriority;
    complexity: number;
    estimatedHours: number;
    dueDate?: Date;
    labels?: string[];
    tags?: string[];
    riskScore: number;
    aiSummary?: string;
  }) {
    return prisma.task.create({
      data: {
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        creatorId: data.creatorId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        complexity: data.complexity,
        estimatedHours: data.estimatedHours,
        dueDate: data.dueDate,
        labels: data.labels || [],
        tags: data.tags || [],
        riskScore: data.riskScore,
        aiSummary: data.aiSummary,
      },
    });
  }

  async update(id: string, data: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    actualHours?: number;
    riskScore?: number;
    aiSummary?: string;
  }) {
    return prisma.task.update({
      where: { id },
      data,
    });
  }

  async createHistory(taskId: string, changeBy: string, field: string, oldValue: string, newValue: string) {
    return prisma.taskHistory.create({
      data: { taskId, changeBy, field, oldValue, newValue },
    });
  }

  async addDependency(blockedTaskId: string, dependentOnId: string) {
    return prisma.taskDependency.create({
      data: { blockedTaskId, dependentOnId },
    });
  }
}

export const taskRepository = new TaskRepository();
