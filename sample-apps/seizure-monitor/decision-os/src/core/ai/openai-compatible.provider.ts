import { Injectable } from '@nitrostack/core';
import { AIProvider, AIProviderHealth } from './ai-provider.interface.js';

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string; type?: string; code?: string | number };
};

/**
 * OpenAI-compatible provider shared by local Ollama and cloud providers such
 * as Groq. The application only depends on this provider interface; no tool
 * or engine code needs to know where inference is running.
 */
@Injectable()
export class OpenAICompatibleProvider implements AIProvider {
  private readonly baseUrl = (
    process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1'
  ).replace(/\/$/, '');
  private readonly apiKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY || 'ollama';
  private readonly model = process.env.AI_MODEL || 'qwen/qwen3-32b';
  // Keep the six-engine pipeline below Groq's free-tier TPM limit.
  private readonly maxTokens = Math.max(
    256,
    Number.parseInt(process.env.AI_MAX_TOKENS || '900', 10) || 900
  );
  private readonly requestTimeoutMs = Math.max(
    5000,
    Number.parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '12000', 10) || 12000
  );

  constructor() {
    console.error(`[AI Provider Startup] Provider: OpenAI-compatible`);
    console.error(`[AI Provider Startup] Base URL: ${this.baseUrl}`);
    console.error(`[AI Provider Startup] Model: ${this.model}`);
    console.error(`[AI Provider Startup] API key configured: ${this.apiKey ? 'YES' : 'NO'}`);
  }

  public async generateStructuredJson<T>(
    prompt: string,
    systemInstruction: string,
    schema: Record<string, any>
  ): Promise<T> {
    const requestBody = JSON.stringify({
      model: this.model,
      temperature: 0.2,
      max_tokens: this.maxTokens,
      reasoning_effort: 'none',
      messages: [
        {
          role: 'system',
          content: `${systemInstruction}\n\nReturn only valid JSON matching this schema:\n${JSON.stringify(schema)}`,
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: requestBody,
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });

      const responseText = await response.text();
      let payload: ChatCompletionResponse;
      try {
        payload = JSON.parse(responseText) as ChatCompletionResponse;
      } catch {
        throw new Error(
          `AI provider returned invalid HTTP JSON (${response.status}): ${responseText.slice(0, 500)}`
        );
      }

      if (!response.ok) {
        const message = payload.error?.message || `AI request failed with HTTP ${response.status}`;
        if (response.status === 429 && attempt < 2) {
          const retrySeconds = this.retryDelaySeconds(message);
          console.error(`[AI Provider] Rate limit reached; retrying in ${retrySeconds}s.`);
          await new Promise((resolve) => setTimeout(resolve, retrySeconds * 1000));
          continue;
        }
        throw new Error(message);
      }

      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('AI provider returned an empty response.');
      }

      try {
        return JSON.parse(this.extractJson(content)) as T;
      } catch (error: any) {
        throw new Error(
          `AI provider returned invalid structured JSON: ${error?.message || String(error)}. ` +
          `Response preview: ${content.slice(0, 800)}`
        );
      }
    }

    throw new Error('AI provider request exhausted its retry attempts.');
  }

  public async healthCheck(): Promise<AIProviderHealth> {
    const startedAt = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      const message = response.ok ? undefined : `AI provider returned HTTP ${response.status}`;
      return {
        provider: 'OpenAI-compatible',
        model: this.model,
        status: response.ok ? 'HEALTHY' : 'UNHEALTHY',
        latencyMs: Date.now() - startedAt,
        ...(message ? { error: message } : {}),
      };
    } catch (error: any) {
      return {
        provider: 'OpenAI-compatible',
        model: this.model,
        status: 'UNHEALTHY',
        latencyMs: Date.now() - startedAt,
        error: error?.message || String(error),
      };
    }
  }

  private extractJson(content: string): string {
    const cleaned = content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    // Some reasoning models prepend a short explanation or a <think> block.
    // Keep only the outer JSON object so the engine contract remains stable.
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return cleaned.slice(start, end + 1);
    }
    return cleaned;
  }

  private retryDelaySeconds(message: string): number {
    const match = message.match(/(\d+(?:\.\d+)?)s/);
    const providerDelay = match ? Math.ceil(Number(match[1])) : 10;
    return Math.min(Math.max(providerDelay, 5), 20);
  }
}
