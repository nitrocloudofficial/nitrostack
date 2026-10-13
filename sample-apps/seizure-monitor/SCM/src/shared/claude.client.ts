import { Injectable } from '@nitrostack/core';
import { z } from 'zod';

/**
 * LLM client backed by OpenRouter (https://openrouter.ai).
 *
 * OpenRouter exposes an OpenAI-compatible `/chat/completions` endpoint.
 * Free-tier models (`:free` suffix) require no billing setup — just a
 * free API key from https://openrouter.ai/keys.
 *
 * Set OPENROUTER_API_KEY in your .env / NitroCloud Vault.
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Free models available on OpenRouter (no credit card required).
 * Primary: meta-llama/llama-3.1-8b-instruct:free  — fast, good at structured JSON.
 * Fallback: google/gemma-3-12b-it:free             — strong instruction-following.
 *
 * Keep the `:free` suffix — it selects the zero-cost provider route on OpenRouter.
 */
export type LlmModel =
  | 'meta-llama/llama-3.1-8b-instruct:free'
  | 'google/gemma-3-12b-it:free'
  | 'mistralai/mistral-7b-instruct:free'
  | 'deepseek/deepseek-r1-0528:free';

const DEFAULT_MODEL: LlmModel = 'meta-llama/llama-3.1-8b-instruct:free';

interface OpenRouterResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Keep the old name so all existing imports (`ClaudeClient`) compile without change.
@Injectable()
export class ClaudeClient {
  private readonly openRouterKey = process.env.OPENROUTER_API_KEY ?? '';
  private readonly anthropicKey = process.env.ANTHROPIC_API_KEY ?? '';

  async complete(
    systemPrompt: string,
    userPrompt: string,
    model: string = DEFAULT_MODEL, // param kept for call-site compatibility
    temperature = 0.1,
  ): Promise<string> {
    // 1. Try OpenRouter if key is present
    if (this.openRouterKey) {
      const res = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openRouterKey}`,
          'HTTP-Referer': 'https://nitrocloud.ai',   // required by OpenRouter
          'X-Title': 'ALE-SCM MCP Server',           // optional — shows in OpenRouter dashboard
        },
        body: JSON.stringify({
          model,
          temperature,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter API error ${res.status}: ${err}`);
      }

      const data = (await res.json()) as OpenRouterResponse;
      return data.choices[0]?.message?.content ?? '';
    }

    // 2. Try Gemini API direct if key is a Gemini API key (starts with 'AQ.' or 'AIzaSy')
    const isGeminiKey = this.anthropicKey.startsWith('AIzaSy') || this.anthropicKey.startsWith('AQ.');
    if (this.anthropicKey && isGeminiKey) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.anthropicKey}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature,
            responseMimeType: 'application/json'
          }
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${err}`);
      }

      const data = (await res.json()) as {
        candidates: Array<{
          content: {
            parts: Array<{ text: string }>
          }
        }>
      };
      return data.candidates[0]?.content?.parts[0]?.text ?? '';
    }

    // 3. Try Anthropic direct if key is present
    if (this.anthropicKey) {
      // Map to correct model name format if needed
      const anthropicModel = model.includes('/') ? 'claude-haiku-20240307' : model;
      const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: 4096,
          temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude API error ${res.status}: ${err}`);
      }

      const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
      return data.content[0]?.text ?? '';
    }

    throw new Error(
      'Neither OPENROUTER_API_KEY nor ANTHROPIC_API_KEY (or GEMINI_API_KEY) is set. ' +
      'Please check your .env file or configuration.'
    );
  }

  /**
   * Call the LLM and parse the JSON result against a Zod schema.
   * Retries once on validation failure with the error appended to the prompt.
   */
  async completeAndParse<T>(
    schema: z.ZodType<T>,
    systemPrompt: string,
    userPrompt: string,
    model: string = DEFAULT_MODEL,
  ): Promise<T> {
    const attempt = async (prompt: string): Promise<T> => {
      const raw = await this.complete(systemPrompt, prompt, model);
      // Strip markdown fences if the model adds them anyway
      const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
      return schema.parse(JSON.parse(cleaned));
    };

    try {
      return await attempt(userPrompt);
    } catch (firstErr: unknown) {
      const errMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      const retryPrompt = `${userPrompt}\n\nYour last output failed validation: ${errMsg}. Fix and return JSON only.`;
      return await attempt(retryPrompt);
    }
  }
}
