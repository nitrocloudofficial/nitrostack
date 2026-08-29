import { Injectable } from '@nitrostack/core';
import { ValidatedVariant, Disease, SampleSet } from '../../types.js';

const RSID_PATTERN = /^rs\d+$/i;

// Pre-validated sample sets for demo use, sourced from published GWAS literature
export const SAMPLE_SETS: Record<SampleSet, { rsids: string[]; description: string; disease: Disease }> = {
  T2D_SAMPLE: {
    disease: 'type2_diabetes',
    description: 'Well-established Type 2 Diabetes risk variants — TCF7L2 (rs7903146, rs12255372), IGF2BP2 (rs4402960), CDKAL1 (rs7756992), HHEX (rs1111875), SLC30A8 (rs13266634)',
    rsids: ['rs7903146', 'rs12255372', 'rs4402960', 'rs7756992', 'rs1111875', 'rs13266634'],
  },
  CAD_SAMPLE: {
    disease: 'coronary_artery_disease',
    description: 'Established Coronary Artery Disease risk variants — 9p21.3 locus (rs1333049, rs4977574)',
    rsids: ['rs1333049', 'rs4977574'],
  },
  AMD_SAMPLE: {
    disease: 'age_related_macular_degeneration',
    description: 'Established Age-Related Macular Degeneration risk variants — CFH (rs1061170), ARMS2 (rs10490924)',
    rsids: ['rs1061170', 'rs10490924'],
  },
};

@Injectable()
export class VariantService {
  validateRsids(rawIds: string[]): ValidatedVariant[] {
    return rawIds.map(raw => {
      const trimmed = raw.trim();
      const normalized = trimmed.toLowerCase().startsWith('rs')
        ? trimmed.toLowerCase()
        : `rs${trimmed}`;

      if (!RSID_PATTERN.test(trimmed)) {
        return {
          rsid: trimmed,
          isValid: false,
          normalizedRsid: trimmed,
          error: `Invalid rsID format: "${trimmed}" — expected format: rs followed by digits (e.g. rs7903146)`,
        };
      }

      return {
        rsid: trimmed,
        isValid: true,
        normalizedRsid: normalized,
      };
    });
  }

  expandSampleSet(sampleSet: SampleSet): { rsids: string[]; disease: Disease; description: string } {
    return SAMPLE_SETS[sampleSet];
  }
}
