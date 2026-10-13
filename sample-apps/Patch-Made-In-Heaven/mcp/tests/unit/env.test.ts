import { describe, expect, it } from 'vitest';
import { loadEnv, describeCapabilities, EnvironmentConfigError } from '../../src/config/env.js';

const MINIMAL_VALID_ENV = {} as NodeJS.ProcessEnv;

describe('loadEnv', () => {
  it('loads a valid minimal configuration with safe defaults', () => {
    const env = loadEnv(MINIMAL_VALID_ENV);
    expect(env.nodeEnv).toBe('development');
    expect(env.search.defaultLimit).toBe(5);
    expect(env.search.maxLimit).toBe(25);
    expect(env.elasticsearch.url).toBeUndefined();
    expect(env.embedding.apiKey).toBeUndefined();
  });

  it('treats missing optional credentials as valid (offline/degraded mode)', () => {
    expect(() => loadEnv(MINIMAL_VALID_ENV)).not.toThrow();
  });

  it('treats a blank KEY= value the same as unset (dotenv parses blank lines as empty strings, not undefined)', () => {
    // Regression test: copying .env.example to .env exactly as documented
    // produces ELASTICSEARCH_URL="" (blank), not an absent key. This must
    // load successfully in degraded/offline mode, not throw.
    const env = loadEnv({
      ELASTICSEARCH_URL: '',
      ELASTICSEARCH_API_KEY: '',
      OPENROUTER_API_KEY: '',
      HOST: '',
    } as NodeJS.ProcessEnv);
    expect(env.elasticsearch.url).toBeUndefined();
    expect(env.elasticsearch.apiKey).toBeUndefined();
    expect(env.embedding.apiKey).toBeUndefined();
    expect(env.transport.host).toBeUndefined();
  });

  it('accepts a fully configured production-shaped environment', () => {
    const env = loadEnv({
      ELASTICSEARCH_URL: 'https://es.example.com:9243',
      ELASTICSEARCH_API_KEY: 'super-secret-es-key',
      OPENROUTER_API_KEY: 'super-secret-openrouter-key',
      EMBEDDING_VECTOR_DIMENSIONS: '1024',
    } as NodeJS.ProcessEnv);
    expect(env.elasticsearch.url).toBe('https://es.example.com:9243');
    expect(env.embedding.dimensions).toBe(1024);
  });

  it('accepts an optional OPENROUTER_API_KEY_2 fallback, never required even when the primary key is set', () => {
    const env = loadEnv({
      OPENROUTER_API_KEY: 'super-secret-openrouter-key',
      OPENROUTER_API_KEY_2: 'super-secret-fallback-key',
      EMBEDDING_VECTOR_DIMENSIONS: '1024',
    } as NodeJS.ProcessEnv);
    expect(env.embedding.fallbackApiKey).toBe('super-secret-fallback-key');

    const envWithoutFallback = loadEnv({
      OPENROUTER_API_KEY: 'super-secret-openrouter-key',
      EMBEDDING_VECTOR_DIMENSIONS: '1024',
    } as NodeJS.ProcessEnv);
    expect(envWithoutFallback.embedding.fallbackApiKey).toBeUndefined();
  });

  it('rejects a malformed Elasticsearch URL', () => {
    expect(() =>
      loadEnv({ ELASTICSEARCH_URL: 'not-a-valid-url' } as NodeJS.ProcessEnv)
    ).toThrow(EnvironmentConfigError);
  });

  it('requires EMBEDDING_VECTOR_DIMENSIONS once an embedding API key is set', () => {
    expect(() =>
      loadEnv({ OPENROUTER_API_KEY: 'super-secret-openrouter-key' } as NodeJS.ProcessEnv)
    ).toThrow(EnvironmentConfigError);
  });

  it('rejects a non-positive EMBEDDING_VECTOR_DIMENSIONS', () => {
    expect(() =>
      loadEnv({
        OPENROUTER_API_KEY: 'super-secret-openrouter-key',
        EMBEDDING_VECTOR_DIMENSIONS: '-4',
      } as NodeJS.ProcessEnv)
    ).toThrow(EnvironmentConfigError);
  });

  it('rejects a default result limit greater than the max limit', () => {
    expect(() =>
      loadEnv({
        SEARCH_RESULT_LIMIT_DEFAULT: '50',
        SEARCH_RESULT_LIMIT_MAX: '25',
      } as NodeJS.ProcessEnv)
    ).toThrow(EnvironmentConfigError);
  });

  it('defaults SANDBOX_PROVIDER to local with no E2B_API_KEY required (Decision 010)', () => {
    const env = loadEnv(MINIMAL_VALID_ENV);
    expect(env.sandbox.provider).toBe('local');
    expect(env.sandbox.e2bApiKey).toBeUndefined();
  });

  it('treats blank SANDBOX_PROVIDER/E2B_API_KEY values the same as unset', () => {
    const env = loadEnv({ SANDBOX_PROVIDER: '', E2B_API_KEY: '' } as NodeJS.ProcessEnv);
    expect(env.sandbox.provider).toBe('local');
    expect(env.sandbox.e2bApiKey).toBeUndefined();
  });

  it('accepts SANDBOX_PROVIDER=e2b once E2B_API_KEY is set', () => {
    const env = loadEnv({
      SANDBOX_PROVIDER: 'e2b',
      E2B_API_KEY: 'e2b_super_secret_key',
    } as NodeJS.ProcessEnv);
    expect(env.sandbox.provider).toBe('e2b');
    expect(env.sandbox.e2bApiKey).toBe('e2b_super_secret_key');
  });

  it('rejects SANDBOX_PROVIDER=e2b without an E2B_API_KEY — never silently falls back to local', () => {
    expect(() => loadEnv({ SANDBOX_PROVIDER: 'e2b' } as NodeJS.ProcessEnv)).toThrow(EnvironmentConfigError);
  });

  it('rejects an unrecognized SANDBOX_PROVIDER value', () => {
    expect(() => loadEnv({ SANDBOX_PROVIDER: 'modal' } as NodeJS.ProcessEnv)).toThrow(EnvironmentConfigError);
  });
});

describe('describeCapabilities', () => {
  it('never leaks credential values, only booleans and non-secret metadata', () => {
    const secretEsKey = 'es-secret-9f8a7b6c';
    const secretEmbeddingKey = 'openrouter-secret-1a2b3c';
    const env = loadEnv({
      ELASTICSEARCH_URL: 'https://es.example.com:9243',
      ELASTICSEARCH_API_KEY: secretEsKey,
      OPENROUTER_API_KEY: secretEmbeddingKey,
      EMBEDDING_VECTOR_DIMENSIONS: '1024',
    } as NodeJS.ProcessEnv);

    const capabilities = describeCapabilities(env);
    const serialized = JSON.stringify(capabilities);

    expect(capabilities.elasticsearchConfigured).toBe(true);
    expect(capabilities.embeddingConfigured).toBe(true);
    expect(capabilities.embeddingDimensions).toBe(1024);
    expect(serialized).not.toContain(secretEsKey);
    expect(serialized).not.toContain(secretEmbeddingKey);
  });

  it('reports capabilities as false when credentials are absent', () => {
    const env = loadEnv(MINIMAL_VALID_ENV);
    const capabilities = describeCapabilities(env);
    expect(capabilities.elasticsearchConfigured).toBe(false);
    expect(capabilities.embeddingConfigured).toBe(false);
    expect(capabilities.reasoningConfigured).toBe(false);
  });
});
