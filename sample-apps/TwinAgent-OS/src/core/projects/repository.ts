import { prisma } from '../../config/database.js';
import { ProjectStatus } from '@prisma/client';

export class ProjectRepository {
  async findAllByOrg(organizationId: string) {
    return prisma.project.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        milestones: true,
        tasks: { select: { id: true, status: true, priority: true, riskScore: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        manager: true,
        milestones: true,
        sprints: true,
        objectives: true,
        tasks: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        repositories: true,
        documents: true,
      },
    });
  }

  async create(organizationId: string, data: {
    name: string;
    key: string;
    description?: string;
    managerId?: string;
    targetEndDate?: Date;
    budget?: number;
  }) {
    return prisma.project.create({
      data: {
        organizationId,
        name: data.name,
        key: data.key,
        description: data.description,
        managerId: data.managerId,
        targetEndDate: data.targetEndDate,
        budget: data.budget,
      },
    });
  }

  async update(id: string, data: {
    name?: string;
    status?: ProjectStatus;
    riskScore?: number;
    healthScore?: number;
    completionRate?: number;
  }) {
    return prisma.project.update({
      where: { id },
      data,
    });
  }

  async createMilestone(projectId: string, name: string, dueDate?: Date) {
    return prisma.milestone.create({
      data: { projectId, name, dueDate },
    });
  }

  async createSprint(projectId: string, name: string, startDate: Date, endDate: Date, goal?: string) {
    return prisma.sprint.create({
      data: { projectId, name, startDate, endDate, goal },
    });
  }

  async createObjective(projectId: string, title: string, targetValue: number, metric: string) {
    return prisma.objective.create({
      data: { projectId, title, targetValue, metric },
    });
  }
}

export const projectRepository = new ProjectRepository();
