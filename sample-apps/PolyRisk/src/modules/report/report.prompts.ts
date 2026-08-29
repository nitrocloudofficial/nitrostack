import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class ReportPrompts {
  @Prompt({
    name: 'explain_polyrisk_finding',
    description:
      'Explains a PolyRisk filtering decision or risk tier in plain, non-alarming language. Use this to translate technical findings (p-values, odds ratios, filtering reasons) into clear language a non-specialist can understand without feeling medical anxiety.',
    arguments: [
      {
        name: 'finding_type',
        description: 'What to explain: "filter_decision", "risk_tier", "confidence_level", or "prs_score"',
        required: true,
      },
      {
        name: 'finding_value',
        description: 'The specific value or reason to explain (e.g. the filter reason string, the tier name, a p-value)',
        required: true,
      },
      {
        name: 'disease',
        description: 'The disease context: type2_diabetes, coronary_artery_disease, or age_related_macular_degeneration',
        required: false,
      },
    ],
  })
  async explainFinding(args: any, ctx: ExecutionContext) {
    const { finding_type, finding_value, disease } = args;
    const diseaseLabel = disease === 'type2_diabetes'
      ? 'Type 2 Diabetes'
      : disease === 'coronary_artery_disease'
        ? 'Coronary Artery Disease'
        : disease === 'age_related_macular_degeneration'
          ? 'Age-Related Macular Degeneration'
          : 'the disease';

    ctx.logger.info('Generating plain-language explanation', { finding_type });

    const systemGuidance = `You are explaining a genetic risk finding to a non-specialist.
Your tone must be calm, factual, and reassuring. Never catastrophize.
Never state a specific probability of getting a disease as certain fact.
Frame everything as relative risk or tendency, not destiny.
Use plain language. Avoid jargon without explanation.
If the finding is a filter exclusion, explain what the scientific criterion means in everyday terms.
Keep the explanation under 4 sentences.`;

    const userPrompt = (() => {
      switch (finding_type) {
        case 'filter_decision':
          return `Explain this evidence-filtering decision in plain language: "${finding_value}". What does it mean and why was this criterion applied?`;
        case 'risk_tier':
          return `Explain what a "${finding_value}" polygenic risk tier means for ${diseaseLabel}. What does it tell us and what doesn't it tell us?`;
        case 'confidence_level':
          return `Explain what a "${finding_value}" confidence level means in a polygenic risk score for ${diseaseLabel}. Why might confidence be limited?`;
        case 'prs_score':
          return `Explain what a PRS score of "${finding_value}" means in the context of ${diseaseLabel} risk. What should and shouldn't the person take from this number?`;
        default:
          return `Explain this genetic finding in plain language: "${finding_value}"`;
      }
    })();

    return [
      {
        role: 'user' as const,
        content: `${systemGuidance}\n\n${userPrompt}`,
      },
    ];
  }
}
