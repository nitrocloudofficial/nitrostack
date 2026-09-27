import { userRepository } from './repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { Role } from '@prisma/client';

export class UserService {
  async getAllUsers(organizationId: string) {
    return userRepository.findAllByOrg(organizationId);
  }

  async getUserById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async updateUserProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      jobTitle?: string;
      departmentId?: string;
      managerId?: string;
      weeklyCapacity?: number;
      role?: Role;
    }
  ) {
    return userRepository.update(userId, data);
  }

  async addSkill(userId: string, name: string, proficiency: number, category?: string) {
    return userRepository.addSkill(userId, name, proficiency, category);
  }

  async calculateWorkload(userId: string) {
    const activeTasks = await userRepository.findActiveTasksForUser(userId);
    const totalEstimatedHours = activeTasks.reduce((sum, t) => sum + t.estimatedHours, 0);

    const user = await userRepository.update(userId, { currentWorkload: totalEstimatedHours });

    return {
      userId,
      weeklyCapacity: user.weeklyCapacity,
      currentWorkloadHours: totalEstimatedHours,
      loadPercentage: Math.round((totalEstimatedHours / user.weeklyCapacity) * 100),
      activeTasksCount: activeTasks.length,
    };
  }
}

export const userService = new UserService();
