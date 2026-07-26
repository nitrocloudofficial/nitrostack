import { z } from 'zod';
import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { DatabaseService } from '../database/database.service.js';

// Escape special regex chars to prevent ReDoS
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DRUG_CLASS_INTERACTIONS: Record<string, string[]> = {
  'nsaid': ['anticoagulant', 'aspirin', 'corticosteroid'],
  'anticoagulant': ['nsaid', 'aspirin', 'antiplatelet'],
  'ssri': ['maoi', 'tramadol', 'lithium'],
  'maoi': ['ssri', 'snri', 'tyramine'],
  'statin': ['fibrate', 'niacin', 'cyclosporine'],
};

const searchMedicineInput = z.object({
  query: z.string().min(1).max(100).describe('Name of the medicine to search for (partial match supported).'),
  checkInteractionWith: z.string().optional().describe('Another medicine or drug class to check for interactions with.'),
});

@Injectable({ deps: [DatabaseService] })
export class PharmacyTools {
  constructor(private readonly db: DatabaseService) {}

  @Tool({
    name: 'medicine-search',
    title: 'Search Medicine',
    description:
      'Search the pharmacy inventory for a medicine by name. Returns availability, stock level, dosage forms, and generic alternatives. Optionally checks for known class-level drug interactions.',
    inputSchema: searchMedicineInput,
    invocation: { invoking: 'Searching pharmacy…', invoked: 'Medicine search complete' },
    metadata: { category: 'pharmacy', tags: ['medicine', 'drugs', 'inventory', 'interaction'] },
  })
  async searchMedicine(input: z.infer<typeof searchMedicineInput>, ctx: ExecutionContext) {
    ctx.logger.info('medicine-search', { query: input.query });
    const medModel = await this.db.medicines();

    // Sanitized regex search (H4, H6 fix)
    const safeQuery = escapeRegex(input.query.trim());
    const medicines = await medModel
      .find({ name: { $regex: new RegExp(safeQuery, 'i') } })
      .select('-_id -__v') // C6: Remove internal DB fields
      .limit(20)
      .lean()
      .exec();

    if (medicines.length === 0) {
      return {
        found: false,
        query: input.query,
        medicines: [],
        summary: `No medicines found matching "${input.query}". Try a shorter search term or check the spelling.`,
      };
    }

    // Drug interaction check (Innovation feature)
    let interactionWarning: string | null = null;
    if (input.checkInteractionWith) {
      const drugLower = input.checkInteractionWith.toLowerCase();
      for (const [cls, interactions] of Object.entries(DRUG_CLASS_INTERACTIONS)) {
        if (drugLower.includes(cls)) {
          const medicineName = medicines[0]?.name?.toLowerCase() ?? '';
          const hasRisk = interactions.some(i => medicineName.includes(i) || input.query.toLowerCase().includes(i));
          if (hasRisk) {
            interactionWarning = `⚠️ Potential interaction detected between ${medicines[0]?.name} and ${input.checkInteractionWith}. Always consult a pharmacist or physician before combining medications. This is an AI-generated class-level warning — not a clinical assessment.`;
          }
        }
      }
    }

    return {
      found: true,
      query: input.query,
      count: medicines.length,
      medicines,
      interactionWarning,
      disclaimer: 'Pharmacy data is synthetic for demo purposes. Do not use for clinical decisions.',
      summary: `Found ${medicines.length} medicine(s) matching "${input.query}".${interactionWarning ? ' ⚠️ Interaction warning detected.' : ''}`,
    };
  }
}
