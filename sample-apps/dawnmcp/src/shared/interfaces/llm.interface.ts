/**
 * LLM Service Interface
 *
 * Provider-agnostic contract for language model interactions.
 * Implementations can wrap Ollama, OpenAI, or any compatible API.
 */

/** A single message in a chat conversation. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Options for LLM generation calls. */
export interface LlmOptions {
  /** Override the default model for this call. */
  model?: string;
  /** Sampling temperature (0-2). Lower = more deterministic. */
  temperature?: number;
  /** Maximum tokens to generate. */
  maxTokens?: number;
  /** Request timeout in milliseconds. */
  timeoutMs?: number;
}

/** Structured response from an LLM call. */
export interface LlmResponse {
  /** The generated text content. */
  content: string;
  /** Model that produced the response. */
  model: string;
  /** Total processing duration in nanoseconds (Ollama-specific). */
  totalDuration?: number;
}

/** Provider-agnostic LLM service contract. */
export interface ILlmService {
  /** Send a multi-turn chat and receive a complete response. */
  generateResponse(messages: ChatMessage[], options?: LlmOptions): Promise<LlmResponse>;

  /** Generate a response constrained to a JSON schema. */
  generateStructuredResponse<T>(
    prompt: string,
    schema: Record<string, unknown>,
    options?: LlmOptions,
  ): Promise<T>;

  /** Stream a chat response, invoking the callback for each token chunk. */
  streamResponse(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: LlmOptions,
  ): Promise<string>;

  /** Verify the LLM backend is reachable and the model is available. */
  checkConnection(): Promise<boolean>;
}
