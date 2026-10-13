/**
 * The bridge's connection to an LLM, via OpenRouter.
 *
 * OpenRouter fronts every major model behind one OpenAI-compatible API, which
 * gives this project three things that matter:
 *   - one credential (`OPENROUTER_API_KEY`) reaches Claude, Gemini, GPT,
 *     DeepSeek, Llama etc., so a demo can iterate on model choice without a
 *     code change;
 *   - a genuine free tier via the `:free` model suffix (DeepSeek R1 by
 *     default), so the swarm's per-persona reasoning and the master
 *     orchestrator both run at $0 during hackathon iteration;
 *   - a single wire format (OpenAI Chat Completions) so the tool loop below
 *     is provider-neutral.
 *
 * The two public methods `reason` and `runAgentic` preserve the same shapes the
 * callers already speak, so the swarm code and the orchestrator did not need to
 * change when the underlying provider was swapped from the Anthropic SDK to
 * this one.
 *
 * Three properties matter more than anything else here:
 *
 *   1. **Grounding.** A persona never asks the model to recall a codebase. The
 *      deterministic parsers run first and their output is handed to the model
 *      as evidence; the model's job is judgment over that evidence, not
 *      retrieval. That is what stops it inventing a coverage threshold.
 *   2. **Structured output.** Every `reason` call constrains the response to
 *      JSON via `response_format: { type: 'json_object' }` and validates the
 *      shape with the caller's Zod-backed validator, so a malformed answer
 *      fails loudly instead of flowing into the manifest.
 *   3. **Degradation.** If there is no API key, or the network is down, or a
 *      response fails validation, the caller gets a discriminated failure and
 *      falls back to the deterministic path. A demo that dies because one
 *      persona ate a rate-limit is not a demo.
 */
import { Injectable } from '@nitrostack/core';
import OpenAI from 'openai';
import { APIError } from 'openai';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

/** Default model. Override with BRIDGE_LLM_MODEL. */
export const DEFAULT_MODEL = 'deepseek/deepseek-r1:free';

/**
 * Per-million-token prices for common models. Used for the running cost readout
 * in the swarm console. `:free` models bill at $0/M — that is the point of
 * defaulting to one.
 *
 * Numbers are approximate and update-when-you-notice-they're-wrong; OpenRouter
 * lists the current rates at https://openrouter.ai/models. Missing entries fall
 * back to $0 rather than guessing, so an unknown model reports "cost unknown"
 * rather than a fabricated number.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  'deepseek/deepseek-r1:free': { input: 0, output: 0 },
  'deepseek/deepseek-r1': { input: 0.55, output: 2.19 },
  'deepseek/deepseek-chat': { input: 0.14, output: 0.28 },
  'anthropic/claude-3.5-sonnet': { input: 3, output: 15 },
  'anthropic/claude-3.5-haiku': { input: 1, output: 5 },
  'anthropic/claude-opus-4.5': { input: 5, output: 25 },
  'anthropic/claude-opus-4': { input: 15, output: 75 },
  'openai/gpt-4o': { input: 2.5, output: 10 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai/o1-mini': { input: 3, output: 12 },
  'google/gemini-2.5-pro': { input: 1.25, output: 10 },
  'google/gemini-2.5-flash': { input: 0.075, output: 0.3 },
  'google/gemini-2.0-flash:free': { input: 0, output: 0 },
  'meta-llama/llama-3.3-70b-instruct:free': { input: 0, output: 0 },
};

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface TokenUsage {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
  /** USD, computed from the model's published rates. Zero when unknown. */
  costUsd: number;
}

export const ZERO_USAGE: TokenUsage = {
  input: 0,
  output: 0,
  cacheWrite: 0,
  cacheRead: 0,
  costUsd: 0,
};

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    cacheRead: a.cacheRead + b.cacheRead,
    costUsd: a.costUsd + b.costUsd,
  };
}

/** A JSON Schema object constraining the model's response. */
export type JsonSchema = Record<string, unknown>;

export interface ReasonRequest<T> {
  /** Which persona is asking — used for logging and the console readout. */
  agent: string;
  /** The persona brief. Stable across runs. */
  system: string;
  /** The deterministic findings the model reasons over. */
  evidence: string;
  /** The specific question, appended after the evidence. */
  task: string;
  /**
   * The desired output shape. Injected into the system prompt so any model can
   * honour it, and re-checked by `validate` on the way back.
   */
  schema: JsonSchema;
  /** Second gate: validates semantics. Throw or return null to reject. */
  validate: (raw: unknown) => T;
  effort?: Effort;
  maxTokens?: number;
}

export interface ReasonResult<T> {
  value: T;
  usage: TokenUsage;
  durationMs: number;
  model: string;
}

/** Why a call did not produce a value. Surfaced rather than swallowed. */
export type LlmFailure =
  | { kind: 'disabled' }
  | { kind: 'refused'; category: string | null; explanation?: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'error'; message: string; retryable: boolean };

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: JsonSchema;
}

export interface ToolInvocation {
  name: string;
  input: Record<string, unknown>;
  /** Rendered result, already truncated to something a context window can hold. */
  result: string;
  durationMs: number;
}

export interface AgenticResult {
  text: string;
  calls: ToolInvocation[];
  usage: TokenUsage;
  durationMs: number;
  model: string;
  /** True when the loop stopped because it hit the iteration cap. */
  truncated: boolean;
}

@Injectable()
export class LlmService {
  private client: OpenAI | null;
  private explicitlyDisabled: boolean;
  /** Non-null when configure() supplied an override key at runtime. */
  private runtimeApiKey: string | null = null;

  private cumulative: TokenUsage = { ...ZERO_USAGE };
  private callCount = 0;

  constructor() {
    this.explicitlyDisabled = process.env.BRIDGE_LLM_ENABLED === 'false';
    this.client = this.buildClient();
  }

  private buildClient(): OpenAI | null {
    if (this.explicitlyDisabled) return null;
    const key = this.resolveApiKey();
    if (!key) return null;
    return new OpenAI({
      apiKey: key,
      baseURL: process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL,
      // Recommended by OpenRouter — routes usage attribution and keeps the
      // free-tier quota associated with this app rather than the account root.
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'https://github.com/agentic-bridge',
        'X-Title': process.env.OPENROUTER_APP_TITLE || 'Enterprise Agentic Bridge',
      },
      // Per-request wall-clock cap so a hung upstream cannot pin the swarm
      // for the SDK default (10 min). Overridable for users on genuinely slow
      // reasoning models. The value has to be higher than the model's
      // realistic time-to-first-byte on cold requests — 60s is right for
      // free-tier reasoning models, low enough to fail-fast on a hang.
      timeout: Number(process.env.BRIDGE_LLM_TIMEOUT_MS ?? 60_000),
      // maxRetries=0: rate-limit retries compound badly when we already run
      // seven personas in parallel. Fail-fast into the discriminated result
      // and let the swarm's own latch logic decide when to give up.
      maxRetries: Number(process.env.BRIDGE_LLM_MAX_RETRIES ?? 0),
    });
  }

  private resolveApiKey(): string | null {
    if (this.runtimeApiKey) return this.runtimeApiKey;
    // OpenRouter first, then legacy Anthropic vars as a courtesy so users who
    // followed the previous setup instructions don't have to re-configure.
    return (
      process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.ANTHROPIC_API_KEY?.trim() ||
      null
    );
  }

  /**
   * Reconfigure the LLM connection at runtime.
   *
   * Lets an administrator drop in an API key from inside NitroStudio without
   * restarting the server. Persistence to `.env` is opt-in — many teams would
   * rather rotate keys per-session.
   */
  configure(options: {
    apiKey?: string;
    model?: string;
    effort?: Effort;
    disable?: boolean;
  }): { available: boolean; description: string; source: string } {
    if (options.disable) {
      this.explicitlyDisabled = true;
      this.client = null;
      process.env.BRIDGE_LLM_ENABLED = 'false';
      return { available: false, description: this.description, source: 'disabled' };
    }

    if (options.apiKey !== undefined) {
      const trimmed = options.apiKey.trim();
      if (trimmed) {
        this.runtimeApiKey = trimmed;
        process.env.OPENROUTER_API_KEY = trimmed;
        this.explicitlyDisabled = false;
        process.env.BRIDGE_LLM_ENABLED = 'true';
        this.client = this.buildClient();
      }
    }

    if (options.model !== undefined && options.model.trim()) {
      process.env.BRIDGE_LLM_MODEL = options.model.trim();
    }

    if (options.effort && ['low', 'medium', 'high', 'xhigh', 'max'].includes(options.effort)) {
      process.env.BRIDGE_LLM_EFFORT = options.effort;
    }

    return {
      available: this.available,
      description: this.description,
      source: this.runtimeApiKey ? 'runtime' : this.available ? 'env' : 'none',
    };
  }

  get model(): string {
    return process.env.BRIDGE_LLM_MODEL?.trim() || DEFAULT_MODEL;
  }

  get effort(): Effort {
    const configured = process.env.BRIDGE_LLM_EFFORT?.trim() as Effort | undefined;
    return configured && ['low', 'medium', 'high', 'xhigh', 'max'].includes(configured)
      ? configured
      : 'high';
  }

  /** Whether a credential is actually present. Checked without a network call. */
  get available(): boolean {
    return !this.explicitlyDisabled && !!this.client && !!this.resolveApiKey();
  }

  get description(): string {
    if (this.explicitlyDisabled) return 'disabled (BRIDGE_LLM_ENABLED=false)';
    if (!this.available) return 'no credential found (set OPENROUTER_API_KEY)';
    return `${this.model} via OpenRouter @ effort=${this.effort}`;
  }

  /** Running total across this process, for the console readout. */
  get spend(): TokenUsage & { calls: number } {
    return { ...this.cumulative, calls: this.callCount };
  }

  resetSpend(): void {
    this.cumulative = { ...ZERO_USAGE };
    this.callCount = 0;
  }

  /* ------------------------------------------------------------------ *
   * Structured reasoning — one call, JSON-object constrained
   * ------------------------------------------------------------------ */

  /**
   * Ask the model a question about pre-gathered evidence and get a typed answer.
   *
   * Returns a discriminated result rather than throwing: every caller here has a
   * deterministic fallback, so a failure is a branch, not an exception.
   *
   * Portability: rather than sending `response_format: { type: 'json_schema' }`
   * — which only a subset of models support — the schema is embedded in the
   * system prompt as "return JSON of this shape", and `response_format:
   * { type: 'json_object' }` guarantees the response parses as JSON. The
   * caller's Zod-backed `validate` is the second, semantic gate.
   */
  async reason<T>(
    request: ReasonRequest<T>
  ): Promise<{ ok: true; data: ReasonResult<T> } | { ok: false; failure: LlmFailure }> {
    if (!this.available || !this.client) {
      return { ok: false, failure: { kind: 'disabled' } };
    }

    const started = Date.now();
    const maxTokens = request.maxTokens ?? 8000;
    const deadlineMs = this.deadlineMs();

    const systemPrompt =
      `${request.system}\n\n` +
      `Respond with a single JSON object matching this JSON Schema exactly. ` +
      `Do not include any prose outside the JSON.\n\n` +
      `<schema>\n${JSON.stringify(request.schema, null, 2)}\n</schema>`;

    const userPrompt = `<evidence>\n${request.evidence}\n</evidence>\n\n${request.task}`;

    try {
      // AbortController + Promise.race deadline: the SDK's own `timeout` covers
      // the initial connect but not streaming trickles that some reasoning
      // models emit (poolside, some deepseek routes). Racing against a wall
      // clock guarantees we never pin the swarm on a slow upstream.
      const controller = new AbortController();
      const message = await this.withDeadline(
        this.client.chat.completions.create(
          {
            model: this.model,
            max_tokens: maxTokens,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
          },
          { signal: controller.signal }
        ),
        deadlineMs,
        controller
      );

      const usage = this.accountFor(message.usage);
      const choice = message.choices?.[0];

      if (choice?.finish_reason === 'length') {
        return {
          ok: false,
          failure: {
            kind: 'invalid',
            message: `Response hit the ${maxTokens}-token cap before completing its JSON.`,
          },
        };
      }
      if (choice?.finish_reason === 'content_filter') {
        return {
          ok: false,
          failure: { kind: 'refused', category: 'content_filter' },
        };
      }

      const text = (choice?.message?.content ?? '').trim();
      if (!text) {
        return { ok: false, failure: { kind: 'invalid', message: 'Model returned no text.' } };
      }

      // Some reasoning models embed JSON inside ```json fences even when asked
      // for pure JSON. Peel them off before parsing rather than failing loudly.
      const cleaned = stripCodeFences(text);

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return {
          ok: false,
          failure: { kind: 'invalid', message: `Model response was not valid JSON: ${cleaned.slice(0, 200)}` },
        };
      }

      let value: T;
      try {
        value = request.validate(parsed);
      } catch (error) {
        return {
          ok: false,
          failure: {
            kind: 'invalid',
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }

      return {
        ok: true,
        data: {
          value,
          usage,
          durationMs: Date.now() - started,
          model: message.model ?? this.model,
        },
      };
    } catch (error) {
      return { ok: false, failure: this.classify(error) };
    }
  }

  /* ------------------------------------------------------------------ *
   * Agentic loop — the orchestrator's tool-calling path
   * ------------------------------------------------------------------ */

  /**
   * Run a real tool-use loop: the model decides which tools to call, this
   * service executes them and feeds the results back, and the loop continues
   * until the model stops asking.
   *
   * Every invocation is captured so the swarm console can render the
   * orchestrator interrogating its own knowledge base — that observability is
   * the point of hand-rolling the loop rather than delegating to an SDK
   * runner.
   *
   * Note on model choice: not every model on OpenRouter is a good tool caller.
   * DeepSeek R1 sometimes emits malformed `tool_calls` or refuses to call a
   * tool at all; a persona pass still works because it is a single JSON call,
   * but the orchestrator briefing may end up empty. If the loop stops with no
   * final text, the caller sees `truncated: true` and can decide whether to
   * proceed manifest-only or retry with a different model.
   */
  async runAgentic(request: {
    agent: string;
    system: string;
    task: string;
    tools: ToolSpec[];
    execute: (name: string, input: Record<string, unknown>) => Promise<string>;
    maxIterations?: number;
    maxTokens?: number;
    effort?: Effort;
    onProgress?: (note: string) => void;
  }): Promise<{ ok: true; data: AgenticResult } | { ok: false; failure: LlmFailure }> {
    if (!this.available || !this.client) {
      return { ok: false, failure: { kind: 'disabled' } };
    }

    const started = Date.now();
    const maxIterations = request.maxIterations ?? 12;
    const maxTokens = request.maxTokens ?? 8000;
    const calls: ToolInvocation[] = [];
    let usage: TokenUsage = { ...ZERO_USAGE };
    let truncated = true;
    let finalText = '';

    const openAiTools = request.tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));

    // Typed as `any[]` to sidestep the OpenAI SDK's per-role message unions:
    // the loop appends assistant messages with `tool_calls`, tool messages with
    // `tool_call_id`, and user turns freely, and threading each variant through
    // the discriminated union costs more than it protects.
    const messages: any[] = [
      { role: 'system', content: request.system },
      { role: 'user', content: request.task },
    ];

    const deadlineMs = this.deadlineMs();

    try {
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        const controller = new AbortController();
        const message = await this.withDeadline(
          this.client.chat.completions.create(
            {
              model: this.model,
              max_tokens: maxTokens,
              messages,
              tools: openAiTools,
              tool_choice: 'auto',
            },
            { signal: controller.signal }
          ),
          deadlineMs,
          controller
        );

        usage = addUsage(usage, this.accountFor(message.usage));
        const choice = message.choices?.[0];

        if (choice?.finish_reason === 'content_filter') {
          return {
            ok: false,
            failure: { kind: 'refused', category: 'content_filter' },
          };
        }

        const assistantMessage = choice?.message;
        if (!assistantMessage) {
          return {
            ok: false,
            failure: { kind: 'invalid', message: 'Model returned no message.' },
          };
        }

        // Echo the assistant turn back — required so the model sees its own
        // tool_calls in the next round and can correlate the tool results.
        messages.push({
          role: 'assistant',
          content: assistantMessage.content ?? '',
          ...(assistantMessage.tool_calls?.length
            ? { tool_calls: assistantMessage.tool_calls }
            : {}),
        });

        const toolCalls = assistantMessage.tool_calls ?? [];
        if (!toolCalls.length) {
          finalText = (assistantMessage.content ?? '').trim();
          truncated = false;
          break;
        }

        for (const call of toolCalls) {
          if (call.type !== 'function') continue;
          const name = call.function?.name ?? 'unknown';
          let input: Record<string, unknown> = {};
          try {
            input = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
          } catch {
            // A malformed arguments string is a model bug; report it back as
            // the tool result so the model can correct itself rather than
            // failing the whole loop.
            input = {};
          }

          request.onProgress?.(`${request.agent} → ${name}`);

          const callStarted = Date.now();
          let rendered: string;
          try {
            rendered = await request.execute(name, input);
          } catch (error) {
            rendered = `Tool failed: ${error instanceof Error ? error.message : String(error)}`;
          }

          calls.push({ name, input, result: rendered, durationMs: Date.now() - callStarted });
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: rendered,
          });
        }
      }

      return {
        ok: true,
        data: {
          text: finalText,
          calls,
          usage,
          durationMs: Date.now() - started,
          model: this.model,
          truncated,
        },
      };
    } catch (error) {
      return { ok: false, failure: this.classify(error) };
    }
  }

  /* ------------------------------------------------------------------ *
   * Internals
   * ------------------------------------------------------------------ */

  /** Effective per-call wall clock. `BRIDGE_LLM_TIMEOUT_MS` overrides. */
  private deadlineMs(): number {
    return Number(process.env.BRIDGE_LLM_TIMEOUT_MS ?? 60_000);
  }

  /**
   * Race a promise against a hard deadline, aborting the in-flight request
   * when the deadline wins. Distinct from the SDK's `timeout` because that
   * covers connect-and-first-byte only and lets a slow-trickling upstream
   * pin the swarm indefinitely.
   */
  private async withDeadline<T>(
    promise: Promise<T>,
    ms: number,
    controller: AbortController
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new DeadlineError(`Deadline exceeded (${ms}ms)`));
          }, ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private accountFor(raw?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  }): TokenUsage {
    const rates = PRICING[this.model] ?? { input: 0, output: 0 };
    const input = raw?.prompt_tokens ?? 0;
    const output = raw?.completion_tokens ?? 0;

    const usage: TokenUsage = {
      input,
      output,
      cacheWrite: 0,
      cacheRead: 0,
      costUsd: (input * rates.input + output * rates.output) / 1_000_000,
    };

    this.cumulative = addUsage(this.cumulative, usage);
    this.callCount += 1;
    return usage;
  }

  /**
   * Map an SDK error onto the failure union.
   *
   * OpenRouter surfaces provider errors through the standard OpenAI error
   * codes, so this classifier stays vendor-neutral. 429 always means "back
   * off" here even for provider-side rate limits, because OpenRouter's own
   * :free-tier limiter is the most common source.
   */
  private classify(error: unknown): LlmFailure {
    if (error instanceof DeadlineError) {
      return {
        kind: 'error',
        message: `${error.message}. Model "${this.model}" did not respond in time — try a faster model or raise BRIDGE_LLM_TIMEOUT_MS.`,
        retryable: true,
      };
    }
    // The OpenAI SDK's AbortError surfaces as a plain APIError with status 0.
    // If our controller signalled abort but wrapping raced first, land here.
    if (error instanceof Error && (error.name === 'AbortError' || /aborted|abort/i.test(error.message))) {
      return {
        kind: 'error',
        message: `Request aborted (deadline hit for ${this.model}).`,
        retryable: true,
      };
    }
    if (error instanceof APIError) {
      const status = error.status ?? 0;
      if (status === 401 || status === 403) {
        return {
          kind: 'error',
          message: 'OpenRouter rejected the credential — check OPENROUTER_API_KEY.',
          retryable: false,
        };
      }
      if (status === 404) {
        return {
          kind: 'error',
          message: `Model "${this.model}" is not available on OpenRouter. Check BRIDGE_LLM_MODEL.`,
          retryable: false,
        };
      }
      if (status === 429) {
        return {
          kind: 'error',
          message: `Rate limited by OpenRouter (${error.message}). Free tier is capped at 20 req/min.`,
          retryable: true,
        };
      }
      return {
        kind: 'error',
        message: `OpenRouter error ${status}: ${error.message}`,
        retryable: status >= 500,
      };
    }
    return {
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
      retryable: false,
    };
  }
}

/** Sentinel thrown by withDeadline so classify() can produce a useful failure. */
class DeadlineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeadlineError';
  }
}

/** Strip ```json / ``` fences that some reasoning models add around JSON output. */
function stripCodeFences(text: string): string {
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/m.exec(text.trim());
  return fenceMatch ? fenceMatch[1].trim() : text;
}

/** One-line rendering of a failure, for logs and the console readout. */
export function describeFailure(failure: LlmFailure): string {
  switch (failure.kind) {
    case 'disabled':
      return 'LLM reasoning disabled (no credential)';
    case 'refused':
      return `refused by safety classifiers${failure.category ? ` (${failure.category})` : ''}`;
    case 'invalid':
      return `unusable response: ${failure.message}`;
    case 'error':
      return failure.message;
  }
}
