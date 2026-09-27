import { z } from 'zod';
import { LLMProvider } from './llm.interface.js';
import { GeminiProvider } from './gemini.provider.js';
import { GroqProvider } from './groq.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { MockProvider } from './mock.provider.js';
import { LLMPipeline, PipelineOptions } from './llm.pipeline.js';

export class LLMService {
  private pipeline: LLMPipeline;
  private mockFallbackPipeline: LLMPipeline;

  constructor(provider?: LLMProvider) {
    let activeProvider = provider;
    if (!activeProvider) {
      if (process.env.USE_MOCK_LLM === 'true') {
        console.log('⚡ [LLMService] Using MockProvider (Offline / Demo Mode)');
        activeProvider = new MockProvider();
      } else if (process.env.GROQ_API_KEY) {
        console.log('🚀 [LLMService] Using GroqProvider (Llama 3.3 70B)');
        activeProvider = new GroqProvider();
      } else if (process.env.OPENAI_API_KEY) {
        console.log('🤖 [LLMService] Using OpenAIProvider (gpt-4o-mini)');
        activeProvider = new OpenAIProvider();
      } else if (process.env.GEMINI_API_KEY) {
        console.log('✨ [LLMService] Using GeminiProvider');
        activeProvider = new GeminiProvider();
      } else {
        console.log('ℹ️ [LLMService] No API key detected, defaulting to MockProvider');
        activeProvider = new MockProvider();
      }
    }
    this.pipeline = new LLMPipeline(activeProvider);
    this.mockFallbackPipeline = new LLMPipeline(new MockProvider());
  }

  async generateStructured<T>(
    system: string,
    user: string,
    schema: z.ZodSchema<T>,
    options?: PipelineOptions
  ): Promise<T> {
    try {
      return await this.pipeline.generateAndValidate(system, user, schema, options);
    } catch (err: any) {
      console.warn(`⚠️ [LLMService] Primary LLM provider failed. Falling back to MockProvider for resilient execution. ${err?.message || err}`);
      return await this.mockFallbackPipeline.generateAndValidate(system, user, schema, options);
    }
  }

  async generateText(
    system: string,
    user: string,
    options?: PipelineOptions
  ): Promise<string> {
    try {
      const stringSchema = z.string();
      return await this.pipeline.generateAndValidate(system, user, stringSchema, {
        ...options,
        responseMimeType: 'text/plain'
      });
    } catch (err: any) {
      console.warn(`⚠️ [LLMService] Primary LLM provider text call failed. Falling back to MockProvider. ${err?.message || err}`);
      const stringSchema = z.string();
      return await this.mockFallbackPipeline.generateAndValidate(system, user, stringSchema, {
        ...options,
        responseMimeType: 'text/plain'
      });
    }
  }
}

export const defaultLLMService = new LLMService();
