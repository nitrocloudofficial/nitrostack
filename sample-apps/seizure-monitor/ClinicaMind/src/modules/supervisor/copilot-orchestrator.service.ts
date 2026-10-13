import { Injectable } from '@nitrostack/core';
import { SupervisorService, EvidencePackage } from './supervisor.service.js';
import { LlmProviderService, LlmMessage } from './llm-provider.service.js';

export interface CopilotQueryRequest {
  query: string;
  patientId?: string;
  transcript?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface CopilotQueryResponse {
  answer: string;
  providerInfo: { provider: string; model: string };
  agentsInvoked: Array<{ name: string; confidence: number }>;
  evidencePackage: EvidencePackage;
  citations: string[];
}

@Injectable({
  deps: [
    SupervisorService,
    LlmProviderService
  ]
})
export class CopilotOrchestratorService {
  constructor(
    private readonly supervisorService: SupervisorService,
    private readonly llmProviderService: LlmProviderService
  ) {}

  async evaluateQuery(query: string, patientId: string = '1234') {
    const result = await this.orchestrateCopilotQuery({ query, patientId });
    return {
      query,
      patientId,
      responseMarkdown: result.answer,
      evidencePackage: result.evidencePackage,
      citations: result.citations
    };
  }

  async orchestrateCopilotQuery(req: CopilotQueryRequest): Promise<CopilotQueryResponse> {
    const patientId = req.patientId || '1234';

    // 1. Execute Dynamic Supervisor Orchestration (Selects required agents, runs parallel, merges Evidence Package)
    const orchestrationResult = await this.supervisorService.orchestrateConsultation(
      `${req.query} ${req.transcript || ''}`,
      patientId
    );

    const evidencePackage = orchestrationResult.evidencePackage;
    const agentsInvoked = orchestrationResult.observability.selectedAgents.map(id => ({
      name: id === 'gap' ? 'Gap Analysis Agent' : `${id.charAt(0).toUpperCase() + id.slice(1)} Agent`,
      confidence: id === 'history' ? 0.98 : id === 'medication' ? 0.95 : id === 'research' ? 0.92 : 0.90
    }));

    const citations = evidencePackage.supportingCitations || [];

    // 2. Formulate System Prompt with Grounded Evidence Package Only
    const systemPrompt = `You are ClinicaMind AI Copilot, an enterprise-grade clinical decision support assistant built on NitroStack MCP.
Your task is to answer the physician's query accurately using ONLY the provided Patient Evidence Package.

CRITICAL INSTRUCTIONS:
- NEVER fabricate patient data or clinical facts not present in the Evidence Package.
- Explicitly cite PMIDs, guidelines (JAMA, NEJM), and EHR documented allergy records whenever applicable.
- If there is a drug contraindication or allergy conflict (e.g. Penicillin allergy), highlight it immediately with high clinical severity.
- Keep the response clear, structured, professional, and directly actionable for an attending physician.

CURRENT PATIENT EVIDENCE PACKAGE:
${JSON.stringify(evidencePackage, null, 2)}`;

    const messages: LlmMessage[] = [{ role: 'system', content: systemPrompt }];

    // Append conversation memory if present
    if (req.conversationHistory && req.conversationHistory.length > 0) {
      for (const turn of req.conversationHistory) {
        messages.push({ role: turn.role, content: turn.content });
      }
    }

    messages.push({ role: 'user', content: req.query });

    // 3. Generate LLM Completion
    const llmResult = await this.llmProviderService.generateCompletion({
      messages,
      temperature: 0.2,
      maxTokens: 1024
    });

    return {
      answer: llmResult.text,
      providerInfo: { provider: llmResult.provider, model: llmResult.model },
      agentsInvoked,
      evidencePackage,
      citations
    };
  }
}
