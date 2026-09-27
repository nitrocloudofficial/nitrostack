import { digitalTwinRepository } from './repository.js';
import { TwinTargetType } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { wsManager } from '../../infrastructure/websocket/index.js';

export interface DigitalTwinScores {
  healthScore: number;
  riskScore: number;
  confidence: number;
  velocity: number;
  burnoutProb: number;
  deliveryProb: number;
  productivity: number;
  knowledgeCover: number;
  commHealth: number;
  focusTime: number;
}

export class DigitalTwinService {
  async calculateUserTwin(userId: string): Promise<DigitalTwinScores> {
    const user = await digitalTwinRepository.findUserWithTasks(userId);

    if (!user) throw new NotFoundError('User not found');

    const totalTasks = user.assignedTasks.length;
    const completedTasks = user.assignedTasks.filter((t) => t.status === 'DONE').length;
    const overdueTasks = user.assignedTasks.filter(
      (t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < new Date()
    ).length;

    const currentWorkload = user.currentWorkload || 0;
    const capacity = user.weeklyCapacity || 40;
    const loadRatio = currentWorkload / capacity;

    const burnoutProb = Math.min(100, Math.round(Math.max(0, (loadRatio - 0.8) * 200)));
    const velocity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 75;
    const deliveryProb = Math.max(10, Math.round(100 - overdueTasks * 20 - burnoutProb * 0.3));
    const productivity = Math.min(100, Math.round(velocity * 0.6 + (100 - burnoutProb) * 0.4));
    const focusTime = Math.max(10, Math.round(80 - (totalTasks > 5 ? (totalTasks - 5) * 5 : 0)));
    const commHealth = 85;
    const knowledgeCover = Math.min(100, (user.skills.length || 1) * 20);
    const riskScore = Math.round(burnoutProb * 0.5 + (100 - deliveryProb) * 0.5);
    const healthScore = Math.max(0, 100 - riskScore);
    const confidence = 0.92;

    const scores = {
      healthScore,
      riskScore,
      confidence,
      velocity,
      burnoutProb,
      deliveryProb,
      productivity,
      knowledgeCover,
      commHealth,
      focusTime,
    };

    await digitalTwinRepository.createSnapshot({
      organizationId: user.organizationId,
      targetType: TwinTargetType.USER,
      targetId: userId,
      ...scores,
      metrics: [
        { metricName: 'Health Score', metricValue: healthScore, category: 'OVERALL' },
        { metricName: 'Burnout Probability', metricValue: burnoutProb, category: 'WELLBEING' },
        { metricName: 'Delivery Probability', metricValue: deliveryProb, category: 'PERFORMANCE' },
        { metricName: 'Velocity', metricValue: velocity, category: 'PERFORMANCE' },
      ],
    });

    wsManager.broadcast('TWIN_UPDATED', { targetType: 'USER', targetId: userId, scores });

    return scores;
  }

  async calculateProjectTwin(projectId: string): Promise<DigitalTwinScores> {
    const project = await digitalTwinRepository.findProjectWithTasks(projectId);

    if (!project) throw new NotFoundError('Project not found');

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === 'DONE').length;
    const blockedTasks = project.tasks.filter((t) => t.status === 'BLOCKED').length;

    const velocity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 50;
    const riskScore = Math.min(100, Math.round(project.riskScore + blockedTasks * 15));
    const healthScore = Math.max(0, 100 - riskScore);
    const deliveryProb = Math.max(10, 100 - riskScore);
    const burnoutProb = 20;
    const productivity = Math.round((velocity + healthScore) / 2);
    const knowledgeCover = 80;
    const commHealth = 90;
    const focusTime = 75;
    const confidence = 0.88;

    const scores = {
      healthScore,
      riskScore,
      confidence,
      velocity,
      burnoutProb,
      deliveryProb,
      productivity,
      knowledgeCover,
      commHealth,
      focusTime,
    };

    await digitalTwinRepository.createSnapshot({
      organizationId: project.organizationId,
      targetType: TwinTargetType.PROJECT,
      targetId: projectId,
      ...scores,
    });

    wsManager.broadcast('TWIN_UPDATED', { targetType: 'PROJECT', targetId: projectId, scores });

    return scores;
  }

  async getLatestSnapshot(targetType: TwinTargetType, targetId: string) {
    return digitalTwinRepository.findLatestSnapshot(targetType, targetId);
  }

  async getHistoricalSnapshots(targetType: TwinTargetType, targetId: string, limit = 20) {
    return digitalTwinRepository.findHistoricalSnapshots(targetType, targetId, limit);
  }
}

export const digitalTwinService = new DigitalTwinService();
