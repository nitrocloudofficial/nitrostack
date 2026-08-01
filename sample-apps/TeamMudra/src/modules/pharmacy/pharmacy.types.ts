import { z } from '@nitrostack/core';

/**
 * ---------------------------------------------------------------------------
 * Domain model
 * ---------------------------------------------------------------------------
 * These types describe pharmacy inventory as the domain understands it,
 * independent of how it's eventually stored (SQLite table shape may differ
 * slightly — the repository layer is responsible for mapping between them).
 */

export type StockStatus = "critical" | "low" | "normal" | "overstocked";

export interface PharmacyItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  reorderThreshold: number;
  maxCapacity: number;
  unit: string; // e.g. "tablets", "vials", "boxes"
  expiryDate: string; // ISO date string
  lastRestockedAt: string; // ISO date string
}

/**
 * Derived, agent-facing view of a single item. Computed by the service —
 * never stored — so the "rules" for what counts as low/critical live in
 * one place and can evolve without touching the DB or the tool contract.
 */
export interface PharmacyItemStatus extends PharmacyItem {
  status: StockStatus;
  daysUntilExpiry: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export interface PharmacyStatusSummary {
  totalItems: number;
  criticalCount: number;
  lowCount: number;
  normalCount: number;
  overstockedCount: number;

  expiredCount: number;
  expiringSoonCount: number;

  generatedAt: string; // ISO timestamp
}

/**
 * ---------------------------------------------------------------------------
 * MCP tool I/O schemas (Zod)
 * ---------------------------------------------------------------------------
 * Zod schemas are the single source of truth for both runtime validation
 * (MCP input) and static TypeScript types (via z.infer), matching the
 * pattern used by the existing Calculator module's tool schemas.
 */

export const GetPharmacyStatusInputSchema = z.object({
  category: z
    .string()
    .optional()
    .describe(
      "Optional category filter (e.g. 'antibiotics'). If omitted, returns all categories."
    ),
  includeNormal: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Whether to include items with normal stock levels in the item list. " +
        "Summary counts always include all items regardless of this flag."
    ),
  expiringWithinDays: z
    .number()
    .int()
    .positive()
    .optional()
    .default(30)
    .describe(
      "Threshold, in days, used to flag items as 'expiring soon' in the summary."
    ),
});

export type GetPharmacyStatusInput = z.infer<typeof GetPharmacyStatusInputSchema>;

export interface GetPharmacyStatusOutput {
  summary: PharmacyStatusSummary;
  items: PharmacyItemStatus[];
}