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
}

export class GroqClient {
  private client: Groq;
  private model: string;

  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options.model || this.model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2048,
    });
    return response.choices[0]?.message?.content || '';
  }

  async jsonChat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<Record<string, unknown>> {
    const response = await this.client.chat.completions.create({
      model: options.model || this.model,
      messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 2048,
      response_format: { type: 'json_object' },
    });
    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
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
