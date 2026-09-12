import { prisma } from '../../config/database.js';
import { Role } from '@prisma/client';

export class UserRepository {
  async findAllByOrg(organizationId: string) {
    return prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        department: true,
        skills: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
        department: true,
        manager: true,
        subordinates: true,
        skills: true,
        assignedTasks: {
          where: { status: { not: 'DONE' } },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      jobTitle?: string;
      departmentId?: string;
      managerId?: string;
      weeklyCapacity?: number;
      role?: Role;
      currentWorkload?: number;
    }
  ) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async addSkill(userId: string, name: string, proficiency: number, category?: string) {
    return prisma.skill.create({
      data: { userId, name, proficiency, category },
    });
  }

  async findActiveTasksForUser(userId: string) {
    return prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED'] },
      },
    });
  }
}

export const userRepository = new UserRepository();
