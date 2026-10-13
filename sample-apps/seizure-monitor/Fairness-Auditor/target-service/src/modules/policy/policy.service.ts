import { Injectable } from '@nitrostack/core';
import { Pool } from 'pg';

/**
 * PolicyService — reads the active mitigation_policy from Postgres.
 *
 * Method contract (locked for Person A's Hour-15.5 integration):
 *   getActive()  → { redact_fields: string[], group_adjustments: Record<string, {threshold_delta: number}>,
 *                    neutral_value: string, rationale: string | null }
 *   getHistory() → same shape[], ordered newest-first
 *
 * DO NOT change these method signatures after Hour 15.5 — Person A's
 * feat/policy-resources-prompts branch calls them directly.
 */
@Injectable()
export class PolicyService {
  private pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:afo@localhost:5432/afo',
  });

  /** Returns the most-recently-created active mitigation_policy row,
   * falling back to a safe no-op policy if none exists yet. */
  async getActive(): Promise<{
    redact_fields: string[];
    neutral_value: string;
    group_adjustments: Record<string, { threshold_delta: number }>;
    rationale: string | null;
  }> {
    try {
      const { rows } = await this.pool.query(
        `SELECT redact_fields, neutral_value, group_adjustments, rationale
         FROM mitigation_policy
         WHERE is_active = true
         ORDER BY created_at DESC
         LIMIT 1`
      );
      if (rows.length === 0) {
        // No policy row yet (pre-Agent-2 run) — return a no-op default.
        return {
          redact_fields: [],
          neutral_value: 'REDACTED',
          group_adjustments: {},
          rationale: 'Default baseline — no active mitigation policy in DB.',
        };
      }
      const row = rows[0];
      return {
        redact_fields: Array.isArray(row.redact_fields) ? row.redact_fields : JSON.parse(row.redact_fields ?? '[]'),
        neutral_value: row.neutral_value ?? 'REDACTED',
        group_adjustments: typeof row.group_adjustments === 'object'
          ? row.group_adjustments
          : JSON.parse(row.group_adjustments ?? '{}'),
        rationale: row.rationale ?? null,
      };
    } catch {
      // DB not yet reachable (early dev) — return safe fallback.
      return {
        redact_fields: [],
        neutral_value: 'REDACTED',
        group_adjustments: {},
        rationale: 'DB unavailable — using fallback policy.',
      };
    }
  }

  /** Returns all mitigation_policy rows, newest first. */
  async getHistory(): Promise<Array<{
    id: string;
    redact_fields: string[];
    neutral_value: string;
    group_adjustments: Record<string, { threshold_delta: number }>;
    rationale: string | null;
    created_at: string;
    is_active: boolean;
  }>> {
    try {
      const { rows } = await this.pool.query(
        `SELECT id, redact_fields, neutral_value, group_adjustments, rationale, created_at, is_active
         FROM mitigation_policy
         ORDER BY created_at DESC`
      );
      return rows.map((r) => ({
        id: r.id,
        redact_fields: Array.isArray(r.redact_fields) ? r.redact_fields : JSON.parse(r.redact_fields ?? '[]'),
        neutral_value: r.neutral_value ?? 'REDACTED',
        group_adjustments: typeof r.group_adjustments === 'object'
          ? r.group_adjustments
          : JSON.parse(r.group_adjustments ?? '{}'),
        rationale: r.rationale ?? null,
        created_at: r.created_at,
        is_active: r.is_active,
      }));
    } catch {
      return [];
    }
  }
}