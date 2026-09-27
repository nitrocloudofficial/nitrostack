import { Injectable } from '@nitrostack/core';
import { ConfigService as NitroConfigService } from '@nitrostack/core';
import { validateEnv, EnvConfig } from './validation.schema.js';

/**
 * Configuration Service
 *
 * Wraps NitroStack ConfigService with validated environment access.
 * Provides type-safe getters for all configured environment variables.
 */
@Injectable()
export class ConfigService {
  private env: EnvConfig;

  constructor(private nitroConfig: NitroConfigService) {
    this.env = validateEnv();
  }

  /**
   * Get raw environment variable
   */
  get<T = string>(key: string): T | undefined {
    return this.nitroConfig.get<T>(key);
  }

  /**
   * Get required environment variable (throws if missing)
   */
  getOrThrow<T = string>(key: string): T {
    const value = this.nitroConfig.get<T>(key);
    if (value === undefined) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  // ========== Semantic Scholar ==========

  getSemanticScholarApiKey(): string | undefined {
    return this.env.SEMANTIC_SCHOLAR_API_KEY;
  }

  // ========== GitHub ==========

  getGithubToken(): string | undefined {
    return this.env.GITHUB_TOKEN;
  }

  // ========== Embeddings ==========

  getEmbeddingProvider(): 'local' | 'openai' {
    return this.env.EMBEDDING_PROVIDER;
  }

  getOpenAiApiKey(): string | undefined {
    return this.env.OPENAI_API_KEY;
  }

  getOpenAiEmbeddingModel(): string {
    return this.env.OPENAI_EMBEDDING_MODEL;
  }

  // ========== Overleaf ==========

  getOverleafConfig(): { gitUrl?: string; gitToken?: string } {
    return {
      gitUrl: this.env.OVERLEAF_GIT_URL,
      gitToken: this.env.OVERLEAF_GIT_TOKEN,
    };
  }

  // ========== Memory Persistence ==========

  getMemoryConfig(): { persistPath: string; intervalMs: number } {
    return {
      persistPath: this.env.MEMORY_PERSIST_PATH,
      intervalMs: this.env.MEMORY_PERSIST_INTERVAL_MS,
    };
  }

  // ========== Core ==========

  getNodeEnv(): string {
    return this.env.NODE_ENV;
  }

  getLogLevel(): string {
    return this.env.LOG_LEVEL;
  }

  // ========== Full validated config ==========

  getValidatedConfig(): EnvConfig {
    return this.env;
  }
}