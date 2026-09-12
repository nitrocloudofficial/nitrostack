import { prisma } from '../../config/database.js';
import { PredictionCategory } from '@prisma/client';

export class PredictionRepository {
  async create(data: {
    organizationId: string;
    category: PredictionCategory;
    title: string;
    targetType: string;
    targetId: string;
    confidence: number;
    reasoning: string;
    evidence: object;
    affectedUsers: string[];
    recommendations: string[];
    alternativeOptions?: string[];
    expectedImpact?: string;
  }) {
    return prisma.prediction.create({
      data: {
        organizationId: data.organizationId,
        category: data.category,
        title: data.title,
        targetType: data.targetType,
        targetId: data.targetId,
        confidence: data.confidence,
        reasoning: data.reasoning,
        evidence: data.evidence as any,
        affectedUsers: data.affectedUsers,
        recommendations: data.recommendations as any,
        alternativeOptions: (data.alternativeOptions || []) as any,
        expectedImpact: data.expectedImpact,
      },
    });
  }

  async findActive(organizationId: string) {
    return prisma.prediction.findMany({
      where: { organizationId, isResolved: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.prediction.findUnique({ where: { id } });
  }

  async markResolved(id: string) {
    return prisma.prediction.update({
      where: { id },
      data: { isResolved: true },
    });
  }
}

export const predictionRepository = new PredictionRepository();
