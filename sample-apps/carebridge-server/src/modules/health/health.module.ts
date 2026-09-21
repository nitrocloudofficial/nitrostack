import { Module } from '@nitrostack/core';
import { HealthIntelligenceTools } from './health.tools.js';

/**
 * Health Intelligence Module - Person 3 Lead
 * Responsibilities:
 * - Retrieve synthetic patient medical history & longitudinal lab trends
 * - Connect current symptom reports with historical lab trajectories (e.g. Hb decline)
 * - Generate structured Clinician/Doctor Briefs for handoff
 */
@Module({
  name: 'health-intelligence',
  description: 'Health Intelligence module for historical medical analysis, lab trends, and clinician brief generation',
  controllers: [HealthIntelligenceTools],
  providers: [HealthIntelligenceTools],
  exports: [HealthIntelligenceTools]
})
export class HealthIntelligenceModule {}
