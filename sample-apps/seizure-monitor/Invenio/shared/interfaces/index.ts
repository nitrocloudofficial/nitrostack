/**
 * Shared Interfaces — Contract definitions for cross-workspace communication.
 * Phase 2: These will be implemented by both FastAPI Pydantic models
 * and TypeScript types to ensure consistency.
 */

export interface IRepository {
  readonly findById: (id: string) => Promise<unknown>
  readonly findAll: (params: unknown) => Promise<unknown>
  readonly create: (data: unknown) => Promise<unknown>
  readonly update: (id: string, data: unknown) => Promise<unknown>
  readonly delete: (id: string) => Promise<void>
}
