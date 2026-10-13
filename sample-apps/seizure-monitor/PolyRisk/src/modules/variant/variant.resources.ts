import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { SAMPLE_SETS } from './variant.service.js';

const DISEASE_LABELS: Record<string, string> = {
  type2_diabetes: 'Type 2 Diabetes',
  coronary_artery_disease: 'Coronary Artery Disease',
  age_related_macular_degeneration: 'Age-Related Macular Degeneration',
};

export class VariantResources {
  @Resource({
    uri: 'disease://{condition}/known-variants',
    name: 'Disease Known Variants',
    description:
      'Browsable list of pre-validated genetic variants for a supported disease. Condition must be one of: type2_diabetes, coronary_artery_disease, age_related_macular_degeneration. Returns rsIDs, gene names, and a brief summary of the evidence base.',
    mimeType: 'application/json',
    examples: {
      response: {
        condition: 'type2_diabetes',
        diseaseName: 'Type 2 Diabetes',
        variantCount: 6,
        variants: [{ rsid: 'rs7903146', gene: 'TCF7L2', notes: 'Strongest T2D signal in genome, OR ~1.37' }],
      },
    },
  })
  async getKnownVariants(uri: string, ctx: ExecutionContext) {
    const match = uri.match(/disease:\/\/([^/]+)\/known-variants/);
    const condition = match?.[1] ?? '';

    ctx.logger.info('Fetching known variants resource', { condition });

    const variantAnnotations: Record<string, Array<{ rsid: string; gene: string; notes: string }>> = {
      type2_diabetes: [
        { rsid: 'rs7903146', gene: 'TCF7L2', notes: 'Strongest T2D locus in the genome; OR ~1.37 per risk allele. Heavily replicated across >100k individuals.' },
        { rsid: 'rs12255372', gene: 'TCF7L2', notes: 'Secondary TCF7L2 variant; OR ~1.29. Correlated with rs7903146.' },
        { rsid: 'rs4402960', gene: 'IGF2BP2', notes: 'Insulin/IGF signaling pathway; OR ~1.17.' },
        { rsid: 'rs7756992', gene: 'CDKAL1', notes: 'Cyclin-dependent kinase 5 regulatory subunit-associated protein; OR ~1.20.' },
        { rsid: 'rs1111875', gene: 'HHEX', notes: 'Hematopoietically expressed homeobox; OR ~1.22. Regulates beta-cell development.' },
        { rsid: 'rs13266634', gene: 'SLC30A8', notes: 'Zinc transporter in pancreatic beta cells; OR ~1.18.' },
      ],
      coronary_artery_disease: [
        { rsid: 'rs1333049', gene: '9p21.3', notes: 'Strongest CAD locus; OR ~1.29. Intergenic, near CDKN2A/B. Mechanism unclear.' },
        { rsid: 'rs4977574', gene: '9p21.3', notes: 'Same 9p21.3 haplotype; OR ~1.29. Highly correlated with rs1333049.' },
      ],
      age_related_macular_degeneration: [
        { rsid: 'rs1061170', gene: 'CFH', notes: 'CFH Y402H substitution; OR ~2.45. Complement pathway dysregulation.' },
        { rsid: 'rs10490924', gene: 'ARMS2/LOC387715', notes: 'High-risk AMD haplotype; OR ~2.72. Strong independent signal.' },
      ],
    };

    const annotations = variantAnnotations[condition];
    if (!annotations) {
      const supported = Object.keys(variantAnnotations).join(', ');
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: `Unknown condition: "${condition}". Supported: ${supported}`,
          }, null, 2),
        }],
      };
    }

    const sampleSetKey = Object.keys(SAMPLE_SETS).find(
      k => (SAMPLE_SETS as any)[k].disease === condition
    );
    const sampleSet = sampleSetKey ? (SAMPLE_SETS as any)[sampleSetKey] : null;

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          condition,
          diseaseName: DISEASE_LABELS[condition] ?? condition,
          sampleSetKey,
          variantCount: annotations.length,
          variants: annotations,
          sampleSetDescription: sampleSet?.description ?? null,
          dataSource: 'NHGRI-EBI GWAS Catalog + published meta-analyses',
          note: 'These variants represent the best-established signals from large-scale GWAS meta-analyses. PolyRisk uses them as reference sets for the three supported diseases.',
        }, null, 2),
      }],
    };
  }
}
