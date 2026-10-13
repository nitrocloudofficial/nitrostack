/**
 * Shared Configuration — Defaults shared across all workspaces.
 * Runtime config overrides these via environment variables.
 */

export const DEFAULT_CONFIG = {
  pagination: { defaultPageSize: 20, maxPageSize: 100 },
  cache: { defaultTtlSeconds: 300 },
  api: { timeoutMs: 30000, retryAttempts: 3 },
  nitro: { maxConcurrentAgents: 5, taskTimeoutMs: 120000 },
} as const
