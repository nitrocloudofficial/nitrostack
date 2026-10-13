import { Module } from '@nitrostack/core';
import { MatchSpecialistTool } from './match-specialist.tool.js';
import { TriggerGpFallbackTool } from './trigger-gp-fallback.tool.js';
import { UpdatePatientProfileTool } from './update_patient_profile.js';
import { GetPatientProfileTool } from './get_patient_profile.js';

/**
 * Triage Module
 *
 * Provides anti-hallucination MCP tools for medical specialist matching and GP fallback routing.
 *
 * Controllers:
 *   - MatchSpecialistTool: Matches patients to available specialists with strict validation
 *   - TriggerGpFallbackTool: Deterministic escape hatch for routing to default GP
 *
 * Security:
 *   - All tools extract patient_id from ExecutionContext (never from user input)
 *   - Zod validation prevents LLM hallucination of invalid specialties
 *   - Error handling returns explicit messages (not exceptions) for LLM self-correction
 */
@Module({
  name: 'triage',
  description: 'Medical triage and specialist matching with anti-hallucination safeguards',
  controllers: [MatchSpecialistTool, TriggerGpFallbackTool, UpdatePatientProfileTool, GetPatientProfileTool],
})
export class TriageModule {}
