import { prisma } from '../../config/database.js';
import { TwinTargetType } from '@prisma/client';

export class DigitalTwinRepository {
  async findUserWithTasks(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignedTasks: true,
        skills: true,
      },
    });
  }

  async findProjectWithTasks(projectId: string) {
    return prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: true },
    });
  }

  async createSnapshot(data: {
    organizationId: string;
    targetType: TwinTargetType;
    targetId: string;
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
    metrics?: { metricName: string; metricValue: number; category: string }[];
  }) {
    return prisma.twinSnapshot.create({
      data: {
        organizationId: data.organizationId,
        targetType: data.targetType,
        targetId: data.targetId,
        healthScore: data.healthScore,
        riskScore: data.riskScore,
        confidence: data.confidence,
        velocity: data.velocity,
        burnoutProb: data.burnoutProb,
        deliveryProb: data.deliveryProb,
        productivity: data.productivity,
        knowledgeCover: data.knowledgeCover,
        commHealth: data.commHealth,
        focusTime: data.focusTime,
        metrics: data.metrics
          ? {
              create: data.metrics,
            }
          : undefined,
      },
    });
  }

  async findLatestSnapshot(targetType: TwinTargetType, targetId: string) {
    return prisma.twinSnapshot.findFirst({
      where: { targetType, targetId },
      orderBy: { snapshotAt: 'desc' },
      include: { metrics: true },
    });
  }

  async findHistoricalSnapshots(targetType: TwinTargetType, targetId: string, limit = 20) {
    return prisma.twinSnapshot.findMany({
      where: { targetType, targetId },
      orderBy: { snapshotAt: 'desc' },
      take: limit,
    });
  }
}

export const digitalTwinRepository = new DigitalTwinRepository();
