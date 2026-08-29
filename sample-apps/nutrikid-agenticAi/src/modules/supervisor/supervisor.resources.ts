import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class SupervisorResources {
  /**
   * Resource 1: Intent Routing
   */
  @Resource({
    uri: 'supervisor://intent-routing',
    name: 'Supervisor Additive Intent Classification Rules',
    description: 'Additive routing dictionary mapping pediatric queries to Medical, Growth, and Food MCP categories.',
    mimeType: 'application/json'
  })
  async getIntentRouting(ctx?: ExecutionContext) {
    if (ctx?.logger?.info) {
      ctx.logger.info('[supervisor://intent-routing] Accessing intent routing standards');
    }
    return {
      type: 'Additive Intent Classifier',
      moduleMappings: [
        {
          intent: 'medical',
          keywords: [
            'symptom', 'fatigue', 'pale', 'pale skin', 'pain', 'bone', 'constipation', 'cold', 'infection',
            'fever', 'medication', 'deficiency', 'iron', 'vitamin', 'calcium', 'rickets', 'anemia',
            'poor appetite', 'loss of appetite', 'reduced appetite', 'vomiting', 'diarrhea', 'persistent cough', 'abdominal pain'
          ],
          targetMcp: 'Medical MCP'
        },
        {
          intent: 'growth',
          keywords: ['height', 'weight', 'weigh', 'weighs', 'bmi', 'percentile', 'stunted', 'underweight', 'overweight', 'obese', 'growth', 'growing', 'short', 'tall', 'short stature', 'slow growth', 'thin'],
          targetMcp: 'Growth MCP'
        },
        {
          intent: 'nutrition',
          keywords: ['food', 'meal', 'diet', 'recipe', 'eating', 'hungry', 'appetite', 'feed', 'breakfast', 'lunch', 'dinner', 'snack', 'nutrition', 'khichdi', 'ragi', 'milk', 'paneer', 'allergy'],
          targetMcp: 'Food MCP'
        }
      ]
    };
  }

  /**
   * Resource 2: Execution Plan
   */
  @Resource({
    uri: 'supervisor://execution-plan',
    name: 'Supervisor MCP Execution Sequencing & Auto-Chaining Guide',
    description: 'Standard ordering (Medical -> Growth -> Food), dependency auto-chaining, and fallback policies for multi-MCP orchestration.',
    mimeType: 'application/json'
  })
  async getExecutionPlan(ctx?: ExecutionContext) {
    if (ctx?.logger?.info) {
      ctx.logger.info('[supervisor://execution-plan] Accessing execution sequencing resource');
    }
    return {
      executionPriorityOrder: ['Medical MCP', 'Growth MCP', 'Food MCP'],
      rationale: 'Medical analysis evaluates active clinical symptoms; Growth evaluation calculates WHO percentiles and stature risk; Food MCP generates final nutritional meal plans.',
      autoChainingRules: [
        'If Medical MCP returns nutrient deficits or diet recommendations -> Auto-invoke Food MCP.',
        'If Growth MCP detects underweight, overweight, stunting, or high growth risk -> Auto-invoke Food MCP.'
      ],
      resiliencePolicy: 'If an individual MCP provider fails or times out, execution logs the error and continues with remaining active MCP modules.'
    };
  }

  /**
   * Resource 3: Response Template
   */
  @Resource({
    uri: 'supervisor://response-template',
    name: 'Supervisor Response Aggregator Template',
    description: 'Multi-section markdown format for aggregated pediatric intelligence reports.',
    mimeType: 'application/json'
  })
  async getResponseTemplate(ctx?: ExecutionContext) {
    if (ctx?.logger?.info) {
      ctx.logger.info('[supervisor://response-template] Accessing response template resource');
    }
    return {
      format: 'Markdown',
      sections: [
        'Assessment',
        'Growth Findings',
        'Medical Findings',
        'Nutrition Findings',
        'Recommendations',
        'Next Steps'
      ]
    };
  }
}
