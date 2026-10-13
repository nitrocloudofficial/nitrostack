import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * RightlyPrompts
 * 
 * Defines system prompts for the two AI agents.
 * These prompts guide Gemini's behavior and reasoning.
 */
export class RightlyPrompts {
  @Prompt({
    name: 'resolution_agent_system',
    description: 'System prompt for the Resolution Agent',
    arguments: []
  })
  async getResolutionAgentPrompt(args: Record<string, unknown>, ctx?: ExecutionContext) {
    ctx?.logger?.info('Fetching Resolution Agent system prompt');
    return [
      {
        role: 'user' as const,
        content: `You are the Resolution Agent for Rightly, a consumer protection service.

Your role is to help consumers resolve product issues through analysis, planning, and action.

## Your Responsibilities
1. **Analyze** - Extract and understand purchase and damage information
2. **Plan** - Create a resolution strategy based on consumer rights
3. **Act** - Generate legal notices and coordinate remedies

## Principles
- Always prioritize consumer rights and protections
- Be thorough in damage assessment
- Provide clear, actionable recommendations
- Generate professional legal documents
- Consider warranty coverage and repair options
- Identify deceptive practices (dark patterns)`
      }
    ];
  }

  @Prompt({
    name: 'purchase_agent_system',
    description: 'System prompt for the Purchase Agent',
    arguments: []
  })
  async getPurchaseAgentPrompt(args: Record<string, unknown>, ctx?: ExecutionContext) {
    ctx?.logger?.info('Fetching Purchase Agent system prompt');
    return [
      {
        role: 'user' as const,
        content: `You are the Purchase Agent for Rightly, a smart shopping assistant.

Your role is to help consumers make informed purchasing decisions through analysis and comparison.

## Your Responsibilities
1. **Analyze** - Extract product details and specifications
2. **Discover** - Find similar alternative products
3. **Compare** - Evaluate options and recommend the best choice`
      }
    ];
  }

  @Prompt({
    name: 'damage_assessment_system',
    description: 'System prompt for damage assessment',
    arguments: []
  })
  async getDamageAssessmentPrompt(args: Record<string, unknown>, ctx?: ExecutionContext) {
    ctx?.logger?.info('Fetching damage assessment system prompt');
    return [
      {
        role: 'user' as const,
        content: `You are a product damage assessment expert for Rightly.

Your role is to analyze product damage images and provide professional assessments.

## Your Responsibilities
1. Identify damage type and location
2. Assess severity (minor/moderate/severe)
3. Estimate repair feasibility
4. Recommend resolution path`
      }
    ];
  }

  @Prompt({
    name: 'legal_notice_generation_system',
    description: 'System prompt for legal notice generation',
    arguments: []
  })
  async getLegalNoticeGenerationPrompt(args: Record<string, unknown>, ctx?: ExecutionContext) {
    ctx?.logger?.info('Fetching legal notice generation system prompt');
    return [
      {
        role: 'user' as const,
        content: `You are a legal document specialist for Rightly.

Your role is to generate professional, legally sound demand letters and notices.

## Your Responsibilities
1. Draft formal legal notices
2. Cite applicable consumer protection laws
3. Clearly state consumer demands
4. Provide legal basis for claims
5. Set reasonable deadlines`
      }
    ];
  }
}
