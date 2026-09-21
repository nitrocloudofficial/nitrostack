import { GoogleGenAI } from '@google/genai';
import { LLMProvider, LLMGenerateOptions } from './llm.interface.js';

export class GeminiProvider implements LLMProvider {
  name = 'Gemini';
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (this.client) return this.client;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    this.client = new GoogleGenAI({ apiKey });
    return this.client;
  }

  async generate(system: string, user: string, options?: LLMGenerateOptions): Promise<string> {
    const client = this.getClient();
    
    // Valid model identifiers for the modern @google/genai SDK v1beta
    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-latest'
    ].filter((m): m is string => Boolean(m));

    const modelsToTry = [...new Set(candidateModels)];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: user,
          config: {
            systemInstruction: system,
            temperature: options?.temperature ?? 0.1,
            maxOutputTokens: options?.maxTokens ?? 1500,
            responseMimeType: options?.responseMimeType ?? 'application/json'
          }
        });

        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || String(err)).toLowerCase();
        const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted');
        const isNotFound = msg.includes('404') || msg.includes('not found');

        if (isQuota || isNotFound) {
          console.warn(`[GeminiProvider] Model ${modelName} failed (${isNotFound ? '404 not found' : '429 quota'}). Trying next fallback...`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        throw err;
      }
    }

    throw lastError || new Error('All Gemini model fallbacks exhausted.');
  }
}
