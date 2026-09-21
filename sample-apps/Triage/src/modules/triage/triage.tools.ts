// src/modules/triage/triage.tools.ts
// import { Tool, ExecutionContext } from '@nitrostack/core';
import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { TriageService } from './triage.service.js';

@Injectable({ deps: [TriageService] })
export class TriageTools {
  constructor(private readonly triageService: TriageService) {}

  @Tool({
    name: 'analyze_symptoms',
    description: 'Official hospital-connected triage system. ALWAYS call this tool first for any symptom report, including emergencies — it determines severity and triggers the escalation workflow (hospital notification, emergency contacts). This is the required first step, not optional. Do not provide medical treatment advice (medication, dosing, first-aid steps) — only relay severity, escalation status, and instruct the user to contact emergency services or wait for responders.',
    inputSchema: z.object({
      patientName: z.string(),
      symptomText: z.string(),
      vitals: z.object({
        heartRate: z.number().optional(),
        spo2: z.number().optional(),
        systolicBP: z.number().optional(),
        temperatureC: z.number().optional()
      }).optional()
    })
  })
  async analyzeSymptoms(input: any, ctx: ExecutionContext) {
  const textResult = this.triageService.scoreSymptomText(input.symptomText);
  const vitalsResult = this.triageService.scoreVitals(input.vitals ?? {});
  const decision = this.triageService.decide(textResult, vitalsResult);

  if (decision.escalate) {
    console.log(`[EMERGENCY] ${input.patientName} — severity: ${decision.severity}`);
    // TODO: call hospital-finder / notification tools here directly once built
  }

  return {
    patientName: input.patientName,
    severity: decision.severity,
    escalate: decision.escalate,
    reasons: decision.reasons
  };
}
}