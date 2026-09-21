import { Injectable, ConfigService } from '@nitrostack/core';
import type { ModelProvider } from './model-provider.interface.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { GroqProvider } from './groq-provider.js';

/**
 * provider-factory.ts -- picks a ModelProvider by config, defaulting to
 * `anthropic` (the only one verified live this session). Set
 * `LLM_PROVIDER=groq` in the environment/.env to switch.
 */
@Injectable({ deps: [ConfigService, AnthropicProvider, GroqProvider] })
export class ModelProviderFactory {
  constructor(
    private readonly config: ConfigService,
    private readonly anthropic: AnthropicProvider,
    private readonly groq: GroqProvider,
  ) {}

  get(): ModelProvider {
    const selected = (this.config.get<string>('LLM_PROVIDER') || 'anthropic').toLowerCase();
    switch (selected) {
      case 'anthropic':
        return this.anthropic;
      case 'groq':
        return this.groq;
      default:
        throw new Error(`Unknown LLM_PROVIDER "${selected}" — expected "anthropic" or "groq"`);
    }
  }
}
