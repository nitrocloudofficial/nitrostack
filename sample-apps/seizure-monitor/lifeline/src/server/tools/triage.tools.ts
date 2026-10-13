import { ToolDecorator as Tool, ControllerDecorator as Controller, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { TriageService } from '../services/triage.service.js';

const triageSymptomsSchema = z.object({
  symptoms: z.string().min(1).describe("Free-form description of the patient's symptoms"),
  patient_age: z.number().int().positive().optional(),
  patient_gender: z.string().optional(),
});
type TriageSymptomsInput = z.infer<typeof triageSymptomsSchema>;

// See HospitalTools for why @Injectable({ deps }) must be stacked on @Controller.
@Controller()
@Injectable({ deps: [TriageService] })
export class TriageTools {
  constructor(private readonly triageService: TriageService) {}

  @Tool({
    name: 'triage_symptoms',
    description:
      'Classify free-form emergency symptom text into a severity level (Critical/Severe/Moderate/Mild) and the hospital department/specialization required, using a deterministic rule-based classifier.',
    inputSchema: triageSymptomsSchema,
    examples: {
      request: { symptoms: 'Sudden crushing chest pain and shortness of breath', patient_age: 58 },
      response: {
        severity: 'Critical',
        requiredDepartment: 'Cardiac Cath Lab',
        confidence: 0.75,
        reasoning: 'Matched keyword(s): "chest pain" → classified as Critical severity, routed to Cardiac Cath Lab.',
      },
    },
  })
  async triageSymptoms(input: TriageSymptomsInput, ctx: ExecutionContext) {
    ctx.logger.info('Triaging symptoms', { patientAge: input.patient_age ?? null, patientGender: input.patient_gender ?? null });
    return this.triageService.triage(input);
  }
}
