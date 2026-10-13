import { Injectable } from '@nitrostack/core';
import { AIProvider, AIProviderHealth } from './ai-provider.interface.js';
import { OpenAICompatibleProvider } from './openai-compatible.provider.js';

@Injectable({ deps: [OpenAICompatibleProvider] })
export class AIService {
  private readonly provider: AIProvider;

  constructor(provider?: AIProvider) {
    this.provider = provider || new OpenAICompatibleProvider();
  }

  /**
   * Generates structured JSON matching the provided schema.
   */
  public async generateStructuredJson<T>(
    prompt: string,
    systemInstruction: string,
    schema: Record<string, any>
  ): Promise<T> {
    return this.provider.generateStructuredJson<T>(prompt, systemInstruction, schema);
  }

  /**
   * Performs a health check on the active AI provider.
   */
  public async healthCheck(): Promise<AIProviderHealth> {
    return this.provider.healthCheck();
  }

  /**
   * Returns the exact raw error returned by Google GenAI SDK without wrapping or replacing.
   */
  public parseProviderError(error: any) {
    if (typeof error?.message === 'string') {
      try {
        return JSON.parse(error.message);
      } catch (parseError: unknown) {
        console.error('AI provider error JSON.parse FAILED');
        console.error('Raw response');
        console.error(error.message);
        console.error('Stack trace');
        console.error(parseError instanceof Error ? parseError.stack : undefined);
        console.error(parseError);
      }
    }
    return {
      error: error?.message || String(error),
      name: error?.name,
      status: error?.status || error?.statusCode,
      stack: error?.stack
    };
  }

  // Backward-compatible alias for existing context tool error handling.
  public parseGeminiError(error: any) {
    return this.parseProviderError(error);
  }
}
