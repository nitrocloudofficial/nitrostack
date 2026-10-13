import { Injectable } from '@nitrostack/core';
import { AIService } from '../../core/ai/ai.service.js';
import { DecisionContext } from '../../shared/contracts/decision-context.js';
import { ExtractContextArgs, DetectMissingInformationArgs, NormalizeRequestArgs } from './context.types.js';

export interface GeminiContextOutput {
  objective: string;
  decisionType: string;
  entities: string[];
  constraints: string[];
  budget: string | number | null;
  location: string | null;
  timeHorizon: string | null;
  confidence: number;
}

@Injectable({ deps: [AIService] })
export class ContextService {
  constructor(private readonly aiService?: AIService) {}

  /**
   * Extracts structured decision context from a raw request using Gemini via AIService.
   */
  public async extractContext(args?: ExtractContextArgs): Promise<DecisionContext & GeminiContextOutput> {
    console.error('[ContextService] Service entered');
    try {
      const rawReq = args?.request || (typeof args === 'string' ? args : '') || 'General Decision Request';

      const systemInstruction = `You are the Context Engine of DecisionOS, an enterprise AI Decision Operating System.
Your job is to analyze the user's decision request and extract structured decision parameters.
Output ONLY valid JSON matching the specified schema. Do NOT include markdown code fences or conversational text.`;

      const prompt = `Analyze the following decision request and extract structured context:
"${rawReq}"`;

      const schema = {
        type: 'OBJECT',
        properties: {
          objective: { type: 'STRING', description: 'Clear statement of what decision needs to be made.' },
          decisionType: { type: 'STRING', description: 'Category of decision e.g., BUSINESS_STRATEGY, FINANCIAL, PERSONAL, LEGAL.' },
          entities: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Key entities, places, or products mentioned.' },
          constraints: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Explicit or implicit constraints.' },
          budget: { type: 'STRING', description: 'Extracted budget or "UNSPECIFIED" if unknown.' },
          location: { type: 'STRING', description: 'Extracted geographical location or "UNSPECIFIED" if unknown.' },
          timeHorizon: { type: 'STRING', description: 'Extracted timeframe or "UNSPECIFIED" if unknown.' },
          confidence: { type: 'INTEGER', description: 'Confidence score from 0 to 100 on clarity of context.' },
        },
        required: ['objective', 'decisionType', 'entities', 'constraints', 'budget', 'location', 'timeHorizon', 'confidence'],
      };

      const ai = this.aiService || new AIService();
      const geminiResult = await ai.generateStructuredJson<{
        objective: string;
        decisionType: string;
        entities: string[];
        constraints: string[];
        budget: string;
        location: string;
        timeHorizon: string;
        confidence: number;
      }>(prompt, systemInstruction, schema);

      const budgetVal = geminiResult.budget === 'UNSPECIFIED' || !geminiResult.budget ? null : (parseFloat(geminiResult.budget) || null);
      const locationVal = geminiResult.location === 'UNSPECIFIED' || !geminiResult.location ? null : geminiResult.location;
      const timeHorizonVal = geminiResult.timeHorizon === 'UNSPECIFIED' || !geminiResult.timeHorizon ? null : geminiResult.timeHorizon;

      const result = {
        objective: geminiResult.objective,
        decisionType: geminiResult.decisionType,
        entities: geminiResult.entities || [],
        constraints: geminiResult.constraints || [],
        budget: budgetVal,
        location: locationVal,
        timeHorizon: timeHorizonVal,
        confidence: geminiResult.confidence || 80,
        assumptions: [],
        stakeholders: [],
        missingInformation: budgetVal === null ? ['budget'] : [],
        ambiguity: null,
        confidenceScore: geminiResult.confidence || 80,
      };

      console.error('[ContextService] Returning response');
      return result;
    } catch (error: any) {
      console.error('[ContextService] Exception in extractContext:');
      console.error(error);
      console.error(error?.stack);
      throw error;
    }
  }

  /**
   * Detects if critical information is missing from the extracted data.
   */
  public detectMissingInformation(args?: DetectMissingInformationArgs): { isComplete: boolean; missingFields: string[] } {
    const missingFields: string[] = [];
    if (!args?.objective) {
      missingFields.push('objective');
    }
    
    return {
      isComplete: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Normalizes the user request to remove noise.
   */
  public normalizeRequest(args?: NormalizeRequestArgs): string {
    const raw = args?.request || (typeof args === 'string' ? args : '') || '';
    return raw.trim().toLowerCase();
  }
}
