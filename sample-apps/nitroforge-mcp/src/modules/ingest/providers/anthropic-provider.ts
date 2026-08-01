import { Injectable, ConfigService } from '@nitrostack/core';
import type { ModelProvider } from './model-provider.interface.js';

/**
 * anthropic-provider.ts -- extracted verbatim from PlannerService's
 * original callModel(). This is the ONLY provider actually verified live
 * against a real endpoint this session: api.anthropic.com is the sole
 * domain reachable from the dev sandbox's network egress (confirmed --
 * every other provider tested returned `x-deny-reason: host_not_allowed`),
 * and the auth failure path (missing/invalid key -> clear error, no silent
 * fallback) was exercised for real.
 */
@Injectable({ deps: [ConfigService] })
export class AnthropicProvider implements ModelProvider {
  readonly name = 'anthropic';

  constructor(private readonly config: ConfigService) {}

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY not set. Configure it via ConfigModule.forRoot() / .env — never hardcode it.',
      );
    }

    const model = this.config.get<string>('ANTHROPIC_MODEL') || 'claude-sonnet-4-6';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`anthropic call failed: HTTP ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as { content?: { type: string; text?: string }[] };
    return (data.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }
}
