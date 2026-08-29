import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { VariantService, SAMPLE_SETS } from './variant.service.js';

const SUPPORTED_DISEASES = ['type2_diabetes', 'coronary_artery_disease', 'age_related_macular_degeneration'] as const;
const SAMPLE_SET_KEYS = ['T2D_SAMPLE', 'CAD_SAMPLE', 'AMD_SAMPLE'] as const;

const variantService = new VariantService();

export class VariantTools {
  @Tool({
    name: 'parse_variants',
    description:
      'Parses and validates a list of rsIDs (e.g. rs7903146) for use in PolyRisk. Accepts a list of rsIDs pasted directly, or a pre-built sample set for one of the three supported diseases (Type 2 Diabetes, Coronary Artery Disease, Age-Related Macular Degeneration). Returns a clean validated list ready for GWAS Catalog lookup. PolyRisk ONLY supports these three diseases — do not attempt PRS for other conditions, as PRS reliability varies enormously based on how well a disease\'s genetic architecture is understood.',
    inputSchema: z.object({
      rsids: z
        .array(z.string())
        .optional()
        .describe('List of rsIDs to validate (e.g. ["rs7903146", "rs12255372"])'),
      sampleSet: z
        .enum(SAMPLE_SET_KEYS)
        .optional()
        .describe('Pre-built demo sample set: T2D_SAMPLE (Type 2 Diabetes), CAD_SAMPLE (Coronary Artery Disease), AMD_SAMPLE (Age-Related Macular Degeneration)'),
      disease: z
        .enum(SUPPORTED_DISEASES)
        .optional()
        .describe('Target disease — required when providing rsids directly; inferred from sampleSet when using a preset'),
    }),
    examples: {
      request: { sampleSet: 'T2D_SAMPLE' },
      response: {
        disease: 'type2_diabetes',
        validCount: 6,
        invalidCount: 0,
        variants: [
          { rsid: 'rs7903146', isValid: true, normalizedRsid: 'rs7903146' },
          { rsid: 'rs12255372', isValid: true, normalizedRsid: 'rs12255372' },
        ],
      },
    },
  })
  async parseVariants(input: any, ctx: ExecutionContext) {
    let rawIds: string[] = input.rsids ?? [];
    let disease: string = input.disease ?? '';

    if (input.sampleSet) {
      const sample = variantService.expandSampleSet(input.sampleSet);
      rawIds = sample.rsids;
      disease = sample.disease;
      ctx.logger.info('Using sample set', { sampleSet: input.sampleSet, disease, count: rawIds.length });
    }

    if (rawIds.length === 0) {
      throw new Error('Provide either rsids or a sampleSet (T2D_SAMPLE, CAD_SAMPLE, or AMD_SAMPLE)');
    }

    if (!SUPPORTED_DISEASES.includes(disease as any)) {
      throw new Error(
        `PolyRisk only supports: type2_diabetes, coronary_artery_disease, age_related_macular_degeneration. ` +
        `PRS for other diseases may be unreliable due to insufficient or inconsistent GWAS data.`
      );
    }

    const variants = variantService.validateRsids(rawIds);
    const validCount = variants.filter(v => v.isValid).length;
    const invalidCount = variants.filter(v => !v.isValid).length;

    ctx.logger.info('Variant parsing complete', { validCount, invalidCount });

    return {
      disease,
      validCount,
      invalidCount,
      variants,
      warnings: invalidCount > 0
        ? variants.filter(v => !v.isValid).map(v => v.error)
        : [],
    };
  }
}
