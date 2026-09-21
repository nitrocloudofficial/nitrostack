import { Module, ToolDecorator as Tool, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { INCIDENTS_DB } from '../incidents/index.js';
import { DISCLAIMER } from '../fixtures/data.js';

@Injectable()
export class AssessmentTools {
  @Tool({
    name: 'assess_urgency',
    description: 'Read an existing incident and return safety-focused, non-medical immediate steps.',
    inputSchema: z.object({
      incidentId: z.string(),
      immediateDanger: z.boolean(),
      injurySeverity: z.enum(['none', 'minor', 'serious', 'unknown']),
    }) as any
  })
  async assessUrgency(
    input: {
      incidentId: string;
      immediateDanger: boolean;
      injurySeverity: 'none' | 'minor' | 'serious' | 'unknown';
    }
  ) {
    const incident = INCIDENTS_DB.get(input.incidentId);
    if (!incident) throw new Error("Incident not found");

    let urgencyLevel = 'STANDARD';
    let message = 'Please proceed with documenting the incident for your records.';

    if (input.immediateDanger || input.injurySeverity === 'serious') {
      urgencyLevel = 'EMERGENCY';
      message = 'Contact local emergency services and seek immediate professional help.';
    } else if (input.injurySeverity === 'minor' || input.injurySeverity === 'unknown') {
      urgencyLevel = 'URGENT';
      message = 'Please ensure you document the incident and seek appropriate professional support if needed.';
    }

    return {
      urgencyLevel,
      message,
      safetyNotice: "This tool does not diagnose health conditions.",
      disclaimer: DISCLAIMER
    };
  }
}

@Module({
  name: 'AssessmentModule',
  controllers: [AssessmentTools]
})
export class AssessmentModule {}
