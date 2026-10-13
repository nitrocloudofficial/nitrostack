import { Injectable } from '@nitrostack/core';
import { getEncoding, type Tiktoken } from 'js-tiktoken';
import type { TokenEstimate } from '../shared/types.js';
import { MAX_PROMPT_CHARS } from '../lib/taxonomy.js';

const TOKENIZER_NAME = 'cl100k_base (js-tiktoken)';

@Injectable()
export class TokenEstimatorService {
  private readonly encoding: Tiktoken;

  constructor() {
    this.encoding = getEncoding('cl100k_base');
  }

  /**
   * Counts tokens in a prompt using the cl100k_base tokenizer (GPT-4 / GPT-3.5 family).
   * Handles empty, oversized, and non-English input without throwing.
   */
  estimateTokens(prompt: string): TokenEstimate {
    const { text, truncated } = this.preparePrompt(prompt);

    if (text.length === 0) {
      return {
        tokenCount: 0,
        tokenizerUsed: TOKENIZER_NAME,
      };
    }

    const tokens = this.encoding.encode(text);

    return {
      tokenCount: tokens.length,
      tokenizerUsed: truncated
        ? `${TOKENIZER_NAME} — input truncated to ${MAX_PROMPT_CHARS} chars`
        : TOKENIZER_NAME,
    };
  }

  private preparePrompt(prompt: string): { text: string; truncated: boolean } {
    const normalized = prompt ?? '';
    if (normalized.length <= MAX_PROMPT_CHARS) {
      return { text: normalized, truncated: false };
    }
    return {
      text: normalized.slice(0, MAX_PROMPT_CHARS),
      truncated: true,
    };
  }
}
