import { Injectable } from '@nitrostack/core';
import type { RewriteResult, TaskType } from '../shared/types.js';

const FILLER_PATTERNS: RegExp[] = [
  /\bplease\b/gi,
  /\bkindly\b/gi,
  /\bI would like you to\b/gi,
  /\bI want you to\b/gi,
  /\bCould you please\b/gi,
  /\bCan you please\b/gi,
  /\bI need you to\b/gi,
  /\bI was wondering if you could\b/gi,
  /\bIt would be great if you could\b/gi,
  /\bI am looking for\b/gi,
  /\bI am trying to\b/gi,
  /\bIn order to\b/gi,
  /\bFor the purpose of\b/gi,
  /\bAt this point in time\b/gi,
  /\bDue to the fact that\b/gi,
  /\bIn the event that\b/gi,
  /\bWith regard to\b/gi,
  /\bAs a matter of fact\b/gi,
  /\bIt is important to note that\b/gi,
  /\bI would appreciate it if\b/gi,
];

const REDUNDANT_INTROS: RegExp[] = [
  /^(Hi|Hello|Hey)[!,.\s]+/i,
  /^(Thanks in advance|Thank you)[!.]?\s*/i,
];

/** Preserves fenced code blocks while trimming prose outside them. */
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;

@Injectable()
export class PromptRewriterService {
  rewritePrompt(prompt: string, taskType: TaskType): RewriteResult {
    const trimmed = prompt.trim();

    if (trimmed.length === 0) {
      return {
        originalPrompt: prompt,
        optimizedPrompt: '',
        tokenSavingsPercent: 0,
        taskType,
      };
    }

    const codeBlocks = trimmed.match(CODE_BLOCK_PATTERN) ?? [];
    const placeholders = codeBlocks.map((_, index) => `__CODE_BLOCK_${index}__`);
    let working = trimmed;

    codeBlocks.forEach((block, index) => {
      working = working.replace(block, placeholders[index] ?? block);
    });

    working = this.stripRedundantIntros(working);
    working = this.stripFiller(working, taskType);
    working = this.normalizeWhitespace(working);
    working = this.applyTaskTypeTuning(working, taskType);

    codeBlocks.forEach((block, index) => {
      working = working.replace(placeholders[index] ?? '', block);
    });

    const optimizedPrompt = working.trim() || trimmed;
    const tokenSavingsPercent = this.computeSavingsPercent(trimmed, optimizedPrompt);

    return {
      originalPrompt: prompt,
      optimizedPrompt,
      tokenSavingsPercent,
      taskType,
    };
  }

  private stripRedundantIntros(text: string): string {
    let result = text;
    for (const pattern of REDUNDANT_INTROS) {
      result = result.replace(pattern, '');
    }
    return result;
  }

  private stripFiller(text: string, taskType: TaskType): string {
    if (taskType === 'creative-writing') {
      return text;
    }

    let result = text;
    for (const pattern of FILLER_PATTERNS) {
      result = result.replace(pattern, '');
    }
    return result;
  }

  private normalizeWhitespace(text: string): string {
    return text
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/gm, '')
      .trim();
  }

  private applyTaskTypeTuning(text: string, taskType: TaskType): string {
    switch (taskType) {
      case 'summarization':
        return text.replace(/\b(provide a detailed|comprehensive|in-depth)\b/gi, '');
      case 'code-generation':
        return text.replace(/\b(walk me through|explain in detail)\b/gi, '');
      case 'data-analysis':
        return text.replace(/\b(I have attached|please find attached)\b/gi, '');
      default:
        return text;
    }
  }

  private computeSavingsPercent(original: string, optimized: string): number {
    if (original.length === 0) return 0;
    const saved = Math.max(0, original.length - optimized.length);
    return Math.min(100, Math.round((saved / original.length) * 100));
  }
}
