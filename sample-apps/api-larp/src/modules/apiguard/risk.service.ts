import { Injectable } from '@nitrostack/core';
import { computeSeverity, deterministicClassify, fallbackAssess } from '../../domain/deterministic-risk.js';
import type { ApiChange, AssessedEvidence, EvidenceItem, MigrationAction } from '../../domain/types.js';
import { ApiGuardConfig } from './config.service.js';
import { RISK_SYSTEM_PROMPT, riskUserPrompt } from './risk.prompt.js';
import { AssessRiskOutputSchema, type AssessRiskOutput } from './risk.schemas.js';

export interface RiskAssessmentResult {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  classifierMode: 'llm' | 'deterministic-fallback' | 'hybrid-with-fallback';
  evidence: AssessedEvidence[];
  limitations: string[];
  modelProvider?: 'openai' | 'anthropic' | 'gemini';
  modelName?: string;
  modelStatus: 'disabled' | 'not-needed' | 'success' | 'fallback';
}

@Injectable({ deps: [ApiGuardConfig] })
export class RiskService {
  constructor(private readonly config: ApiGuardConfig) {}

  async assess(changes: ApiChange[], evidence: EvidenceItem[]): Promise<RiskAssessmentResult> {
    const limitations: string[] = [];
    if (!evidence.length) {
      return {
        severity: computeSeverity([]),
        classifierMode: 'deterministic-fallback',
        evidence: [],
        limitations: ['No consumer code evidence items were provided for risk assessment.'],
        modelStatus: 'not-needed'
      };
    }

    if (!this.config.useLlm) {
      limitations.push('LLM classification is disabled; deterministic fallback was used for all evidence.');
      return {
        severity: computeSeverity(evidence.map((item) => fallbackAssess(item, changes))),
        classifierMode: 'deterministic-fallback',
        evidence: evidence.map((item) => fallbackAssess(item, changes)),
        limitations,
        modelStatus: 'disabled'
      };
    }

    const ambiguousEvidence = evidence.filter((item) => !deterministicClassify(item, changes));
    if (!ambiguousEvidence.length) {
      const classified = evidence.map((item) => deterministicClassify(item, changes) ?? fallbackAssess(item, changes));
      return {
        severity: computeSeverity(classified),
        classifierMode: 'deterministic-fallback',
        evidence: classified,
        limitations: ['All evidence was classified deterministically; no model call was required.'],
        modelStatus: 'not-needed'
      };
    }

    const cappedEvidence = ambiguousEvidence.slice(0, this.config.maxEvidenceItems);
    if (ambiguousEvidence.length > this.config.maxEvidenceItems) {
      limitations.push(`Ambiguous evidence capped to ${this.config.maxEvidenceItems} items (out of ${ambiguousEvidence.length}) for LLM classification.`);
    }

    try {
      const rawOutput = await this.callModel(changes, cappedEvidence);
      const reconciled = this.reconcile(changes, evidence, cappedEvidence, rawOutput);
      return {
        severity: computeSeverity(reconciled.evidence),
        classifierMode: reconciled.hadFallback ? 'hybrid-with-fallback' : 'llm',
        evidence: reconciled.evidence,
        limitations: [...limitations, ...rawOutput.limitations],
        modelProvider: this.config.llmProvider,
        modelName: this.selectedModelName(),
        modelStatus: 'success'
      };
    } catch (err) {
      const sanitizedMsg = String(err instanceof Error ? err.message : err)
        .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, 'Bearer ***')
        .slice(0, 160);
      limitations.push(`The bounded LLM classifier was unavailable: ${sanitizedMsg}`);
      return {
        severity: computeSeverity(evidence.map((item) => fallbackAssess(item, changes))),
        classifierMode: 'deterministic-fallback',
        evidence: evidence.map((item) => fallbackAssess(item, changes)),
        limitations,
        modelProvider: this.config.llmProvider,
        modelName: this.selectedModelName(),
        modelStatus: 'fallback'
      };
    }
  }

  private reconcile(
    changes: ApiChange[],
    allEvidence: EvidenceItem[],
    cappedEvidence: EvidenceItem[],
    output: AssessRiskOutput
  ): { evidence: AssessedEvidence[]; hadFallback: boolean } {
    const modelMap = new Map(output.assessments.map((a) => [a.evidenceId, a]));
    let hadFallback = false;

    const evidence: AssessedEvidence[] = allEvidence.map((item) => {
      const deterministic = deterministicClassify(item, changes);
      if (deterministic) return deterministic;
      const modelAssessment = modelMap.get(item.id);
      if (!modelAssessment) {
        hadFallback = true;
        return fallbackAssess(item, changes);
      }

      // Validate matchedChangeIds is a subset of linked change IDs
      const validChangeIds = new Set(item.relatedChangeIds);
      const matchedChangeIds = modelAssessment.matchedChangeIds.filter((id) => validChangeIds.has(id));

      // Filter migration actions to ensure repository and filePath match evidence item (anti-hallucination)
      const migrationActions: MigrationAction[] = modelAssessment.migrationActions
        .filter((action) => action.repository === item.repository && action.filePath === item.filePath)
        .map((action) => ({
          title: action.title,
          description: action.description,
          repository: item.repository,
          filePath: item.filePath,
          lineNumber: action.lineNumber,
          relatedChangeIds: action.relatedChangeIds.filter((id) => validChangeIds.has(id))
        }));

      return {
        ...item,
        classification: modelAssessment.classification,
        confidence: modelAssessment.confidence,
        matchedChangeIds,
        reasoning: modelAssessment.reasoning,
        migrationActions
      };
    });

    return { evidence, hadFallback };
  }

  private async callModel(changes: ApiChange[], evidence: EvidenceItem[]): Promise<AssessRiskOutput> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.llmTimeoutMs);
    try {
      const raw =
        this.config.llmProvider === 'anthropic' ? await this.callAnthropic(changes, evidence, controller.signal) :
        this.config.llmProvider === 'gemini'    ? await this.callGemini(changes, evidence, controller.signal) :
                                                  await this.callOpenAi(changes, evidence, controller.signal);
      const parsed = JSON.parse(raw) as unknown;
      return AssessRiskOutputSchema.parse(parsed);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callOpenAi(changes: ApiChange[], evidence: EvidenceItem[], signal: AbortSignal): Promise<string> {
    if (!this.config.openAiKey) throw new Error('OPENAI_API_KEY is missing.');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal,
      headers: { Authorization: `Bearer ${this.config.openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.openAiModel, temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: RISK_SYSTEM_PROMPT },
          { role: 'user', content: riskUserPrompt(changes, evidence) }
        ]
      })
    });
    if (!response.ok) throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 150)}`);
    const payload = await response.json() as any;
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('OpenAI response contained no JSON text.');
    return content;
  }

  private async callAnthropic(changes: ApiChange[], evidence: EvidenceItem[], signal: AbortSignal): Promise<string> {
    if (!this.config.anthropicKey) throw new Error('ANTHROPIC_API_KEY is missing.');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal,
      headers: { 'x-api-key': this.config.anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.config.anthropicModel, max_tokens: 1800, temperature: 0, system: RISK_SYSTEM_PROMPT, messages: [{ role: 'user', content: riskUserPrompt(changes, evidence) }] })
    });
    if (!response.ok) throw new Error(`Anthropic ${response.status}: ${(await response.text()).slice(0, 150)}`);
    const payload = await response.json() as any;
    const content = payload.content?.find((item: any) => item.type === 'text')?.text;
    if (typeof content !== 'string') throw new Error('Anthropic response contained no JSON text.');
    return content;
  }

  private async callGemini(changes: ApiChange[], evidence: EvidenceItem[], signal: AbortSignal): Promise<string> {
    if (!this.config.geminiKey) throw new Error('GEMINI_API_KEY is missing.');
    const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
    const response = await fetch(url, {
      method: 'POST', signal,
      headers: { Authorization: `Bearer ${this.config.geminiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.geminiModel,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: RISK_SYSTEM_PROMPT },
          { role: 'user', content: riskUserPrompt(changes, evidence) }
        ]
      })
    });
    if (!response.ok) throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 150)}`);
    const payload = await response.json() as any;
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Gemini response contained no JSON text.');
    return content;
  }

  private selectedModelName(): string {
    return this.config.llmProvider === 'anthropic'
      ? this.config.anthropicModel
      : this.config.llmProvider === 'gemini'
        ? this.config.geminiModel
        : this.config.openAiModel;
  }
}
