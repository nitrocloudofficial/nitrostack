import { z } from 'zod';
import { LLMProvider, LLMGenerateOptions } from './llm.interface.js';
import { parseAndValidate } from './json.repair.js';

export interface PipelineOptions extends LLMGenerateOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export class LLMPipeline {
  constructor(private provider: LLMProvider) {}

  /**
   * Executes LLM generation with provider-agnostic retries, fast 429 rate limit backoff,
   * markdown stripping, JSON repairing, and strict Zod validation.
   */
  async generateAndValidate<T>(
    system: string,
    user: string,
    schema: z.ZodSchema<T>,
    options?: PipelineOptions
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 2;
    let retryDelayMs = options?.retryDelayMs ?? 500;

    let lastError: Error | null = null;
    let currentUserPrompt = user;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const raw = await this.provider.generate(system, currentUserPrompt, options);
        
        if (options?.responseMimeType === 'text/plain') {
          return raw.trim() as unknown as T;
        }

        return parseAndValidate(raw, schema);
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const errMessage = lastError.message.toLowerCase();

        const isRateLimit =
          errMessage.includes('429') ||
          errMessage.includes('quota') ||
          errMessage.includes('resource_exhausted');

        if (isRateLimit) {
          console.warn(`[LLMPipeline] Rate limit encountered (attempt ${attempt}/${maxRetries}). Quick pause ${retryDelayMs}ms...`);
          await new Promise(res => setTimeout(res, retryDelayMs));
          continue;
        }

        if (err instanceof z.ZodError) {
          const validationIssues = err.issues
            .map(i => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
          currentUserPrompt = `${user}\n\nIMPORTANT CORRECTION: Your previous JSON response failed validation: [${validationIssues}]. Please output valid JSON matching the exact schema.`;
        }

        if (attempt < maxRetries) {
          await new Promise(res => setTimeout(res, retryDelayMs));
        }
      }
    }

    throw new Error(
      `LLMPipeline failed using provider [${this.provider.name}] after ${maxRetries} attempts: ${lastError?.message}`
    );
  }
}
