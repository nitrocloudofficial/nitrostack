import { describe, it, expect } from 'vitest';
import { predictionEngineService } from '../core/prediction/service.js';
import { prisma } from '../config/database.js';

describe('Prediction Engine & Explainability Test Suite', () => {
  it('should run prediction scan and produce explainable output fields', async () => {
    const org = await prisma.organization.findFirst();
    if (!org) return;

    const predictions = await predictionEngineService.runOrganizationScan(org.id);
    expect(Array.isArray(predictions)).toBe(true);

    if (predictions.length > 0) {
      const pred = predictions[0];
      expect(pred.confidence).toBeGreaterThan(0);
      expect(pred.reasoning).toBeDefined();
      expect(pred.evidence).toBeDefined();
      expect(Array.isArray(pred.recommendations)).toBe(true);
    }
  });
});
