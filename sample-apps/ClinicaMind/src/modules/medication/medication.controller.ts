import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { MedicationService } from './medication.service.js';

const CheckInteractionsSchema = z.object({
  drugs: z.array(z.string()).describe('List of current and proposed medications to check')
});

const CheckAllergiesSchema = z.object({
  drugs: z.array(z.string()).describe('List of medications'),
  allergies: z.array(z.string()).describe('Documented patient allergies')
});

@Injectable({ deps: [MedicationService] })
export class MedicationController {
  constructor(private readonly medicationService: MedicationService) {}

  @Tool({
    name: 'check_drug_interactions',
    description: 'Check for drug-drug interactions and clinical contraindications across active and proposed prescriptions using RxNorm and openFDA Drug Label APIs.',
    inputSchema: CheckInteractionsSchema,
    examples: {
      request: { drugs: ['Warfarin', 'Ibuprofen'] },
      response: {
        agent: 'Medication Agent',
        interactions: [
          {
            severity: 'HIGH',
            drugs: ['warfarin', 'ibuprofen'],
            description: 'Concomitant use increases upper gastrointestinal and major bleeding risk.',
            recommendation: 'Avoid NSAIDs; switch to Acetaminophen.'
          }
        ]
      }
    }
  })
  async checkDrugInteractions(args: z.infer<typeof CheckInteractionsSchema>, ctx: ExecutionContext) {
    ctx.logger.info(`💊 [Medication Agent] Checking interactions for: ${args.drugs.join(', ')}`);
    const interactions = await this.medicationService.checkDrugInteractionsAsync(args.drugs);
    return {
      status: 'success',
      agent: 'Medication Agent',
      interactions
    };
  }

  @Tool({
    name: 'check_allergy_conflicts',
    description: 'Cross-reference prescribed or proposed medications against documented patient allergy lists.',
    inputSchema: CheckAllergiesSchema,
    examples: {
      request: { drugs: ['Amoxicillin'], allergies: ['Penicillin'] },
      response: {
        agent: 'Medication Agent',
        conflicts: [
          {
            severity: 'CRITICAL',
            drug: 'Amoxicillin',
            allergy: 'Penicillin',
            description: 'CRITICAL ALLERGY ALERT: High risk of anaphylaxis.'
          }
        ]
      }
    }
  })
  async checkAllergyConflicts(args: z.infer<typeof CheckAllergiesSchema>, ctx: ExecutionContext) {
    ctx.logger.info(`🚨 [Medication Agent] Checking allergy conflicts for ${args.drugs.join(', ')} against ${args.allergies.join(', ')}`);
    const conflicts = this.medicationService.checkAllergyConflicts(args.drugs, args.allergies);
    return {
      status: 'success',
      agent: 'Medication Agent',
      conflicts
    };
  }
}
