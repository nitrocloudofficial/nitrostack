import { Module } from '@nitrostack/core';
import { EmergencyTools } from './emergency.tools.js';
import { EmergencyPrompts } from './emergency.prompts.js';

/**
 * EmergencyModule — Agent 3: Emergency & Family Hub
 *
 * Provides tools for:
 * - Emergency card generation (generate_emergency_card)
 *
 * Provides prompts for:
 * - Weekly caregiver briefing (caregiver_briefing)
 */
@Module({
  name: 'emergency',
  description: 'Emergency & Family Hub Agent — critical care card generation and AI-powered weekly caregiver briefing synthesizing data across all health and medication agents.',
  controllers: [EmergencyTools, EmergencyPrompts]
})
export class EmergencyModule {}
