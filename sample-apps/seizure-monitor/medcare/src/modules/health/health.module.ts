import { Module } from '@nitrostack/core';
import { HealthTools } from './health.tools.js';
import { HealthResources } from './health.resources.js';

/**
 * HealthModule — Agent 1: Health Memory Agent
 *
 * Provides tools for:
 * - Lab report text extraction into structured timeline entries (extract_health_data)
 * - Persisting extracted lab results into patient profiles (update_health_memory)
 *
 * Resources exposed:
 * - health://patient-profiles  (all family members)
 * - health://patient-profile/{patient_id}  (individual lookup)
 */
@Module({
  name: 'health',
  description: 'Health Memory Agent — patient profile management, lab report parsing, and health timeline extraction for multi-generational family care.',
  controllers: [HealthTools, HealthResources]
})
export class HealthModule {}
