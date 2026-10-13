import { Injectable } from '@nitrostack/core';

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  temperature?: number;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * TargetModelService wraps Ollama HTTP API for local model inference.
 * Supports v1 and v2 model variants for A/B testing patches.
 * 
 * Ollama must be running locally at OLLAMA_BASE_URL (default: http://localhost:11434)
 * Models must be pre-pulled: `ollama pull phi3:mini` or `ollama pull qwen2.5:3b`
 */
@Injectable()
export class TargetModelService {
  private readonly baseUrl: string;
  private readonly modelV1: string;
  private readonly modelV2: string;
  private readonly temperature: number;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.modelV1 = process.env.TARGET_MODEL_V1 ?? 'tinyllama:1.1b';
    this.modelV2 = process.env.TARGET_MODEL_V2 ?? 'qwen2.5:3b';
    this.temperature = parseFloat(process.env.TARGET_MODEL_TEMPERATURE ?? '0.7');
  }

  /**
   * Test the target model v1 with a prompt.
   * Returns the model's response text.
   * Throws if Ollama is unreachable or model is not pulled.
   */
  async testModelV1(prompt: string): Promise<{ response: string }> {
    const response = await this.callOllama(this.modelV1, prompt);
    return { response };
  }

  /**
   * Test the target model v2 with a prompt.
   * Same interface as v1, different backing model for A/B testing.
   */
  async testModelV2(prompt: string): Promise<{ response: string }> {
    const response = await this.callOllama(this.modelV2, prompt);
    return { response };
  }

  /**
   * Health check: verify Ollama is reachable and models are available.
   */
  async healthCheck(): Promise<{ healthy: boolean; models: string[]; error?: string }> {
    try {
      const tagsUrl = `${this.baseUrl}/api/tags`;
      const res = await fetch(tagsUrl, { method: 'GET' });
      if (!res.ok) {
        return { healthy: false, models: [], error: `Ollama API returned ${res.status}` };
      }
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = data.models?.map(m => m.name) ?? [];
      const hasV1 = models.some(m => m.includes(this.modelV1));
      const hasV2 = models.some(m => m.includes(this.modelV2));
      if (!hasV1 || !hasV2) {
        return {
          healthy: false,
          models,
          error: `Missing models. Expected ${this.modelV1} and ${this.modelV2}, found: ${models.join(', ')}`
        };
      }
      return { healthy: true, models };
    } catch (err) {
      return { healthy: false, models: [], error: `Ollama unreachable at ${this.baseUrl}: ${String(err)}` };
    }
  }

  /**
   * Internal: call Ollama generate endpoint.
   * Blocks until response is complete (stream: false).
   */
  private async callOllama(model: string, prompt: string): Promise<string> {
    const url = `${this.baseUrl}/api/generate`;
    const payload: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
      temperature: this.temperature,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        `Ollama API error: ${res.status} ${res.statusText}. ` +
        `Is Ollama running at ${this.baseUrl}? ` +
        `Is model '${model}' pulled? (Run: ollama pull ${model})`
      );
    }

    const data = (await res.json()) as OllamaGenerateResponse;
    if (!data.response) {
      throw new Error(`Ollama returned empty response for model ${model}`);
    }

    return data.response;
  }
}
