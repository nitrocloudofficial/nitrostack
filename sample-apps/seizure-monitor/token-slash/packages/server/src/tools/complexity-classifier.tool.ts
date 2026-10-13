import { Injectable } from '@nitrostack/core';
import type { ComplexityResult, ComplexityScore, TaskType } from '../shared/types.js';
import {
  COMPLEXITY_LENGTH_THRESHOLDS,
  MAX_PROMPT_CHARS,
  TASK_TYPE_DEFINITIONS,
  TASK_TYPE_MIN_TIER,
} from '../lib/taxonomy.js';

const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const MULTI_STEP_PATTERN =
  /\b(step\s*\d+|first[,.\s]+then|finally[,.\s]+|phase\s*\d+|part\s*[abc123])\b/i;
const CONSTRAINT_PATTERN =
  /\b(must|required|constraint|format:|output:|json|bullet points?|word limit|exactly \d+)\b/i;
const MULTI_QUESTION_PATTERN = /\?[\s\S]{0,80}\?/;

@Injectable()
export class ComplexityClassifierService {
  /**
   * Rule-based complexity and task-type classification.
   * Deterministic heuristics — no external LLM calls.
   */
  classifyComplexity(prompt: string): ComplexityResult {
    const { text, truncated } = this.preparePrompt(prompt);

    if (text.length === 0) {
      return {
        complexityScore: 'simple',
        taskType: 'general-qa',
        reasoning: 'Empty prompt — defaulting to simple general Q&A.',
      };
    }

    const taskType = this.detectTaskType(text);
    const complexityScore = this.detectComplexity(text, taskType);
    const reasoning = this.buildReasoning(text, taskType, complexityScore, truncated);

    return { complexityScore, taskType, reasoning };
  }

  private preparePrompt(prompt: string): { text: string; truncated: boolean } {
    const normalized = (prompt ?? '').trim();
    if (normalized.length <= MAX_PROMPT_CHARS) {
      return { text: normalized, truncated: false };
    }
    return {
      text: normalized.slice(0, MAX_PROMPT_CHARS),
      truncated: true,
    };
  }

  private detectTaskType(prompt: string): TaskType {
    const lower = prompt.toLowerCase();
    let bestMatch: TaskType = 'general-qa';
    let bestScore = 0;

    for (const def of TASK_TYPE_DEFINITIONS) {
      if (def.id === 'general-qa') continue;

      let score = 0;
      for (const signal of def.signals) {
        if (lower.includes(signal.toLowerCase())) {
          score += signal.includes(' ') ? 2 : 1;
        }
      }

      if (CODE_BLOCK_PATTERN.test(prompt) && def.id === 'code-generation') {
        score += 3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = def.id;
      }
    }

    return bestMatch;
  }

  private detectComplexity(prompt: string, taskType: TaskType): ComplexityScore {
    let score = 0;

    if (prompt.length > COMPLEXITY_LENGTH_THRESHOLDS.complex) score += 3;
    else if (prompt.length > COMPLEXITY_LENGTH_THRESHOLDS.moderate) score += 2;
    else if (prompt.length > 200) score += 1;

    if (CODE_BLOCK_PATTERN.test(prompt)) score += 2;
    if (MULTI_STEP_PATTERN.test(prompt)) score += 2;
    if (CONSTRAINT_PATTERN.test(prompt)) score += 1;
    if (MULTI_QUESTION_PATTERN.test(prompt)) score += 1;

    const minTier = TASK_TYPE_MIN_TIER[taskType];
    if (minTier === 'reasoning') score += 3;
    if (minTier === 'standard' && taskType === 'code-generation') score += 1;
    if (taskType === 'reasoning') score += 2;
    if (taskType === 'data-analysis' && prompt.length > 500) score += 1;

    if (score >= 5) return 'complex';
    if (score >= 2) return 'moderate';
    return 'simple';
  }

  private buildReasoning(
    prompt: string,
    taskType: TaskType,
    complexityScore: ComplexityScore,
    truncated: boolean,
  ): string {
    const signals: string[] = [];

    if (truncated) {
      signals.push(`input truncated to ${MAX_PROMPT_CHARS} characters`);
    }

    signals.push(`task type: ${taskType} (${prompt.length} chars)`);

    if (CODE_BLOCK_PATTERN.test(prompt)) signals.push('contains code block');
    if (MULTI_STEP_PATTERN.test(prompt)) signals.push('multi-step instructions');
    if (CONSTRAINT_PATTERN.test(prompt)) signals.push('explicit constraints');
    if (MULTI_QUESTION_PATTERN.test(prompt)) signals.push('multiple questions');

    const def = TASK_TYPE_DEFINITIONS.find((d) => d.id === taskType);
    if (def && taskType !== 'general-qa') {
      signals.push(def.description);
    }

    return `Classified as ${complexityScore} — ${signals.join('; ')}.`;
  }
}
