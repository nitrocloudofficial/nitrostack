import { Injectable, ConfigService } from '@nitrostack/core';
import type { ModelProvider } from './model-provider.interface.js';

/**
 * groq-provider.ts -- OpenAI-compatible chat completions against Groq.
 *
 * HONEST FLAG, not hidden: this has NEVER run against a live endpoint.
 * `api.groq.com` is confirmed blocked from this dev sandbox
 * (`x-deny-reason: host_not_allowed`, same as every other non-Anthropic
 * provider tested). This is written correctly as far as can be verified
 * statically (matches Groq's documented OpenAI-compatible
 * /openai/v1/chat/completions shape), but it is NOT proven the way
 * anthropic-provider.ts is. Treat the first real run of this as a genuine
 * test, not a formality -- Llama-family models are generally less
 * reliable than Claude at strict schema-constrained JSON, which is
 * PlannerService's entire job (snake_case verb-first names, 20-300 char
 * descriptions, composes/primaryEndpoint cross-references, a hard 20-tool
 * budget). The retry loop (MAX_RETRIES = 2 in planner.service.ts) may get
 * exercised more with this provider than it ever has with Anthropic.
 *
 * Config: GROQ_API_KEY (required), GROQ_MODEL (optional, defaults to a
 * current Llama 3.3 model -- verify this is still current when you
 * actually run it; Groq's available models change over time and this
 * default was not checked against a live models list).
 */
@Injectable({ deps: [ConfigService] })
export class GroqProvider implements ModelProvider {
  readonly name = 'groq';

  constructor(private readonly config: ConfigService) {}

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not set. Configure it via ConfigModule.forRoot() / .env — never hardcode it.');
    }

    const model = this.config.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`groq call failed: HTTP ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('groq response had no message content — unexpected shape, check the raw response');
    }
    return text;
  }
}
