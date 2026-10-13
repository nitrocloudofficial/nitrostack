import { Injectable } from '@nitrostack/core';
import { AIService } from '../../core/ai/ai.service.js';
import { IEnginePlugin, EngineMetadata, EngineRequest } from '../../shared/contracts/engine.interface.js';
import { StandardEngineOutput } from '../../shared/types/standard-engine-output.js';
import { ResearchTopicArgs, GatherEvidenceArgs, SummarizeResearchArgs } from './research.types.js';

export interface ResearchEngineResult {
  summary: string;
  industryOverview: string;
  currentTrends: string[];
  supportingFacts: string[];
  opportunities: string[];
  uncertainties: string[];
  confidence: number;
  keyFindings: string[];
  sourcesCount: number;
  verifiedClaims: string[];
  dataGaps: string[];
}

@Injectable({ deps: [AIService] })
export class ResearchService implements IEnginePlugin {
  constructor(private readonly aiService?: AIService) {}

  public getMetadata(): EngineMetadata {
    return {
      engineId: 'research-engine', capabilities: ['search', 'summarize', 'fact-check'],
      supportedDomains: ['general', 'market', 'business'], requiredInputs: ['objective'],
      producedOutputs: ['researchSummary', 'evidence'], executionPriority: 10, dependencies: [],
      parallelExecutionCapability: true, version: '1.0.0', healthStatus: 'HEALTHY'
    };
  }

  public async analyze(context: any): Promise<ResearchEngineResult> {
    const ai = this.aiService || new AIService();
    const prompt = `Analyze this decision context as a research analyst. Base every finding on the supplied context; do not assume a generic industry or reuse canned facts. When evidence is unavailable, say so explicitly and lower confidence. Context:\n${JSON.stringify(context, null, 2)}`;
    const result = await ai.generateStructuredJson<ResearchEngineResult>(prompt, this.systemInstruction(), this.schema());
    const keyFindings = [...(result.supportingFacts || []), ...(result.currentTrends || [])];
    return {
      ...result,
      currentTrends: result.currentTrends || [],
      supportingFacts: result.supportingFacts || [],
      opportunities: result.opportunities || [],
      uncertainties: result.uncertainties || [],
      confidence: this.confidence(result.confidence),
      keyFindings,
      sourcesCount: result.supportingFacts?.length || 0,
      verifiedClaims: result.supportingFacts || [],
      dataGaps: result.uncertainties || []
    };
  }

  public async execute(request: EngineRequest): Promise<StandardEngineOutput> {
    const started = Date.now();
    const analysis = await this.analyze(request.context);
    return {
      engineName: 'research-engine', confidence: analysis.confidence, summary: analysis.summary,
      structuredFindings: { industryOverview: analysis.industryOverview, currentTrends: analysis.currentTrends, supportingFacts: analysis.supportingFacts, opportunities: analysis.opportunities },
      assumptions: [], limitations: analysis.uncertainties, recommendations: analysis.opportunities,
      metadata: { executionTimeMs: Date.now() - started, toolsUsed: ['Gemini'], version: '1.0.0' }
    };
  }

  public async researchTopic(args: ResearchTopicArgs) {
    const ai = this.aiService || new AIService();
    return ai.generateStructuredJson(
      `Prepare a concise research brief for this topic: ${args.topic}. Do not claim to have browsed the web or consulted sources. Separate generally-known context from information that must be verified for a decision.`,
      'You are a careful research assistant. Return only valid JSON. Do not fabricate citations, source URLs, current statistics, or verified facts.',
      {
        type: 'OBJECT',
        properties: {
          topic: { type: 'STRING' },
          overview: { type: 'STRING' },
          keyFindings: { type: 'ARRAY', items: { type: 'STRING' } },
          questionsToVerify: { type: 'ARRAY', items: { type: 'STRING' } },
          limitations: { type: 'ARRAY', items: { type: 'STRING' } },
          confidence: { type: 'INTEGER' },
        },
        required: ['topic', 'overview', 'keyFindings', 'questionsToVerify', 'limitations', 'confidence'],
      },
    );
  }

  public async gatherEvidence(args: GatherEvidenceArgs) {
    const ai = this.aiService || new AIService();
    const result = await ai.generateStructuredJson<{
      claim: string; assessment: string; reasoning: string[]; evidenceNeeded: string[]; verified: boolean; limitations: string[];
    }>(
      `Assess this claim using only general knowledge: ${args.claim}. Identify what evidence would be needed to verify it.`,
      'You are an evidence evaluator. Return only valid JSON. Without supplied sources or live browsing, never call a claim verified. Clearly mark uncertainty.',
      {
        type: 'OBJECT',
        properties: {
          claim: { type: 'STRING' },
          assessment: { type: 'STRING', enum: ['PLAUSIBLE', 'UNCERTAIN', 'IMPROBABLE', 'INSUFFICIENT_EVIDENCE'] },
          reasoning: { type: 'ARRAY', items: { type: 'STRING' } },
          evidenceNeeded: { type: 'ARRAY', items: { type: 'STRING' } },
          verified: { type: 'BOOLEAN' },
          limitations: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['claim', 'assessment', 'reasoning', 'evidenceNeeded', 'verified', 'limitations'],
      },
    );
    return {
      ...result,
      verified: false,
      limitations: [...new Set([...(result.limitations || []), 'No external sources were supplied or fetched by this tool.'])],
    };
  }

  public async summarizeResearch(args: SummarizeResearchArgs) {
    const ai = this.aiService || new AIService();
    const result = await ai.generateStructuredJson<{
      summary: string; keyPoints: string[]; contradictions: string[]; openQuestions: string[]; sourceNoteCount: number;
    }>(
      `Summarize these supplied research notes. Preserve uncertainty and flag contradictions. Notes: ${JSON.stringify(args.rawData)}`,
      'You are a research synthesizer. Return only valid JSON. Use only the supplied notes; do not add facts or citations.',
      {
        type: 'OBJECT',
        properties: {
          summary: { type: 'STRING' },
          keyPoints: { type: 'ARRAY', items: { type: 'STRING' } },
          contradictions: { type: 'ARRAY', items: { type: 'STRING' } },
          openQuestions: { type: 'ARRAY', items: { type: 'STRING' } },
          sourceNoteCount: { type: 'INTEGER' },
        },
        required: ['summary', 'keyPoints', 'contradictions', 'openQuestions', 'sourceNoteCount'],
      },
    );
    return { ...result, sourceNoteCount: args.rawData.length };
  }

  private systemInstruction(): string {
    return 'You are DecisionOS Research Engine. Return only valid JSON. Analyze only the provided decision context. Do not claim live browsing, verified sources, precise statistics, or facts not supported by the context. Label uncertainty clearly.';
  }

  private schema(): Record<string, any> {
    return { type: 'OBJECT', properties: {
      summary: { type: 'STRING' }, industryOverview: { type: 'STRING' }, currentTrends: { type: 'ARRAY', items: { type: 'STRING' } },
      supportingFacts: { type: 'ARRAY', items: { type: 'STRING' } }, opportunities: { type: 'ARRAY', items: { type: 'STRING' } },
      uncertainties: { type: 'ARRAY', items: { type: 'STRING' } }, confidence: { type: 'INTEGER' }
    }, required: ['summary', 'industryOverview', 'currentTrends', 'supportingFacts', 'opportunities', 'uncertainties', 'confidence'] };
  }

  private confidence(value: number): number { return Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : 0)); }
}
