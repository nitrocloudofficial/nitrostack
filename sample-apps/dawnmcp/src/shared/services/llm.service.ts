import { Injectable, OnModuleInit } from '@nitrostack/core';
import type { ChatMessage, ILlmService, LlmOptions, LlmResponse } from '../interfaces/llm.interface.js';
import { AppConfigService } from '../../config/app.config.js';
import { sharedAiQueue } from '../utils/request-queue.js';

/**
 * Ollama LLM Service
 *
 * Connects DawnMCP to a local Ollama instance for chat, structured output,
 * and streaming generation. Queues requests to ensure single-concurrency execution.
 */
@Injectable()
export class LlmService implements ILlmService, OnModuleInit {
  private readonly baseUrl: string;
  private readonly model: string;
  private connected = false;

  constructor(private readonly config: AppConfigService) {
    this.baseUrl = this.config?.ollamaUrl ?? 'http://127.0.0.1:11434';
    this.model = this.config?.chatModel ?? 'qwen2.5-coder:7b';
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    this.connected = await this.checkConnection();
  }

  // ── Public API ─────────────────────────────────────────────────────

  /**
   * Check whether Ollama is reachable and the configured model exists.
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        console.error('⚠️  Ollama responded with status', response.status);
        return false;
      }

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const modelNames = data.models?.map((m) => m.name) ?? [];

      console.error(`✅ Ollama connected — models: ${modelNames.join(', ') || '(none)'}`);

      const modelBase = this.model.split(':')[0];
      if (!modelNames.some((n) => n.startsWith(modelBase))) {
        console.error(`⚠️  Chat model "${this.model}" not found. Run: ollama pull ${this.model}`);
      }
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Cannot connect to Ollama at ${this.baseUrl} — ${message}`);
      console.error('   Start Ollama with: ollama serve');
      return false;
    }
  }

  /**
   * Send a multi-turn chat conversation and receive a complete response.
   */
  async generateResponse(messages: ChatMessage[], options?: LlmOptions): Promise<LlmResponse> {
    return sharedAiQueue.enqueue(async () => {
      const model = options?.model ?? this.model;
      const timeout = options?.timeoutMs ?? 120_000;

      const body: Record<string, unknown> = {
        model,
        messages,
        stream: false,
      };
      if (options?.temperature !== undefined) {
        body.options = { temperature: options.temperature };
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Ollama chat error ${response.status}: ${text}`);
      }

      const data = (await response.json()) as {
        message?: { content?: string };
        model?: string;
        total_duration?: number;
      };

      return {
        content: data.message?.content ?? '',
        model: data.model ?? model,
        totalDuration: data.total_duration,
      };
    });
  }

  /**
   * Generate a response constrained to valid JSON matching the provided schema.
   * Uses Ollama's native JSON mode.
   */
  async generateStructuredResponse<T>(
    prompt: string,
    schema: Record<string, unknown>,
    options?: LlmOptions,
  ): Promise<T> {
    return sharedAiQueue.enqueue(async () => {
      const model = options?.model ?? this.model;
      const timeout = options?.timeoutMs ?? 120_000;

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: [
            'You are a precise JSON generator.',
            'Respond ONLY with valid JSON matching this schema:',
            JSON.stringify(schema, null, 2),
            'Do not include any explanation or markdown — only raw JSON.',
          ].join('\n'),
        },
        { role: 'user', content: prompt },
      ];

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false, format: 'json' }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Ollama structured generation error ${response.status}: ${text}`);
      }

      const data = (await response.json()) as { message?: { content?: string } };
      const raw = data.message?.content ?? '{}';

      try {
        return JSON.parse(raw) as T;
      } catch {
        throw new Error(`Failed to parse LLM JSON output: ${raw.slice(0, 200)}`);
      }
    });
  }

  /**
   * Stream a chat response token-by-token.
   * Returns the full accumulated text after the stream completes.
   */
  async streamResponse(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: LlmOptions,
  ): Promise<string> {
    return sharedAiQueue.enqueue(async () => {
      const model = options?.model ?? this.model;
      const timeout = options?.timeoutMs ?? 300_000;

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        throw new Error(`Ollama stream error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body for streaming');

      const decoder = new TextDecoder();
      let accumulated = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n').filter((l) => l.trim());

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
              const content = parsed.message?.content;
              if (content) {
                accumulated += content;
                onChunk(content);
              }
            } catch {
              // Partial JSON line
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return accumulated;
    });
  }

  /** Whether the last connection check succeeded. */
  isConnected(): boolean {
    return this.connected;
  }
}
