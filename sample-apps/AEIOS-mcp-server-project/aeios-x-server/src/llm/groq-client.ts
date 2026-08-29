import Groq from 'groq-sdk';
import 'dotenv/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  retries?: number;
}

export class GroqClient {
  private client: Groq;
  private model: string;
  private maxRetries: number;

  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    this.maxRetries = 3;
  }

  private async withRetry<T>(fn: () => Promise<T>, retries?: number): Promise<T> {
    const maxAttempts = retries ?? this.maxRetries;
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxAttempts - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<string> {
    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: options.model || this.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2048,
      });
      return response.choices[0]?.message?.content || '';
    }, options.retries);
  }

  async jsonChat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<Record<string, unknown>> {
    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: options.model || this.model,
        messages,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 2048,
        response_format: { type: 'json_object' },
      });
      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    }, options.retries);
  }

  async available(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
