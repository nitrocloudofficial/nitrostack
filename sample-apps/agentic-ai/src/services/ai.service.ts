import { Injectable } from '@nitrostack/core';
import { FACTORYBRAIN_PROMPTS, PROMPT_VERSION, PromptName } from './prompt-templates.js';

export interface AiMessage { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; name?: string; tool_call_id?: string; tool_calls?: AiToolCall[]; }
export interface AiToolDefinition { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> }; }
export interface AiToolCall { id: string; type: 'function'; function: { name: string; arguments: string }; }
export interface AiCompletionRequest {
  task?: PromptName; model?: string; messages: AiMessage[]; tools?: AiToolDefinition[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number; maxTokens?: number; timeoutMs?: number; retries?: number; signal?: AbortSignal;
  toolExecutor?: (name: string, args: Record<string, unknown>) => Promise<unknown>; maxToolRounds?: number;
}
export interface AiCompletionResult { model: string; content: string; toolCalls: AiToolCall[]; toolResults: { toolCallId: string; name: string; result: unknown }[]; usage?: Record<string, number>; promptVersion: typeof PROMPT_VERSION; }

@Injectable()
export class AiService {
  getPrompt(name: PromptName): string { return FACTORYBRAIN_PROMPTS[name]; }
  getPromptVersion(): typeof PROMPT_VERSION { return PROMPT_VERSION; }
  selectModel(task?: PromptName, requested?: string): string {
    if (requested) return requested;
    const taskKey = task ? `FACTORYBRAIN_AI_MODEL_${task.toUpperCase()}` : '';
    return (taskKey && process.env[taskKey]) || process.env.FACTORYBRAIN_AI_MODEL || 'gpt-5-mini';
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const model = this.selectModel(request.task, request.model); const messages = [...request.messages]; const toolResults: AiCompletionResult['toolResults'] = [];
    const maxRounds = request.toolExecutor ? Math.max(1, request.maxToolRounds ?? 3) : 1;
    for (let round = 0; round < maxRounds; round += 1) {
      const response = await this.requestCompletion({ ...request, model, messages });
      const choice = response.choices?.[0]?.message; if (!choice) throw new Error('AI provider returned no completion choice');
      const toolCalls = (choice.tool_calls ?? []) as AiToolCall[];
      if (!request.toolExecutor || toolCalls.length === 0) return { model: response.model ?? model, content: choice.content ?? '', toolCalls, toolResults, usage: response.usage, promptVersion: PROMPT_VERSION };
      messages.push({ role: 'assistant', content: choice.content ?? '', tool_calls: toolCalls });
      for (const call of toolCalls) {
        let args: Record<string, unknown>; try { args = JSON.parse(call.function.arguments || '{}'); } catch { throw new Error(`Invalid tool arguments returned for ${call.function.name}`); }
        const result = await request.toolExecutor(call.function.name, args); toolResults.push({ toolCallId: call.id, name: call.function.name, result });
        messages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: JSON.stringify(result) });
      }
    }
    throw new Error(`AI tool-calling exceeded ${maxRounds} round(s)`);
  }

  private async requestCompletion(request: AiCompletionRequest & { model: string }): Promise<any> {
    const baseUrl = process.env.FACTORYBRAIN_AI_BASE_URL?.replace(/\/$/, '');
    if (!baseUrl) throw new Error('FACTORYBRAIN_AI_BASE_URL is not configured');
    const timeoutMs = request.timeoutMs ?? Number(process.env.FACTORYBRAIN_AI_TIMEOUT_MS ?? 30_000);
    const retries = request.retries ?? Number(process.env.FACTORYBRAIN_AI_RETRIES ?? 2);
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(new Error(`AI request timed out after ${timeoutMs}ms`)), timeoutMs);
      const abort = () => controller.abort(request.signal?.reason); request.signal?.addEventListener('abort', abort, { once: true });
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST', signal: controller.signal,
          headers: { 'content-type': 'application/json', ...(process.env.FACTORYBRAIN_AI_API_KEY ? { authorization: `Bearer ${process.env.FACTORYBRAIN_AI_API_KEY}` } : {}) },
          body: JSON.stringify({ model: request.model, messages: request.messages, tools: request.tools, tool_choice: request.toolChoice, temperature: request.temperature, max_tokens: request.maxTokens }),
        });
        if (!response.ok) { const body = await response.text(); const error = new AiHttpError(response.status, body); if (!retryableStatus(response.status) || attempt === retries) throw error; }
        else return await response.json();
      } catch (error) {
        if (request.signal?.aborted || attempt === retries || (error instanceof AiHttpError && !retryableStatus(error.status))) throw error;
      } finally { clearTimeout(timer); request.signal?.removeEventListener('abort', abort); }
      await delay(Math.min(250 * 2 ** attempt, 2_000));
    }
    throw new Error('AI completion failed');
  }
}
class AiHttpError extends Error { constructor(readonly status: number, body: string) { super(`AI provider returned HTTP ${status}: ${body.slice(0, 500)}`); } }
function retryableStatus(status: number): boolean { return status === 408 || status === 429 || status >= 500; }
function delay(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
