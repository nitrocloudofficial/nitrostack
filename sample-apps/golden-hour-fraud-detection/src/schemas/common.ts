import { z } from 'zod';

/** ISO 8601 datetime string (e.g. 2026-07-25T12:00:00.000Z). */
export const Iso8601TimestampSchema = z.string().datetime({ offset: true });

/** UUID v4 identifier. */
export const UuidSchema = z.string().uuid();

/** ISO 4217 three-letter currency code. */
export const Iso4217CurrencySchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, 'Must be a valid ISO 4217 currency code');

export const TicketStatusSchema = z.enum([
  'submitted',
  'triaged',
  'assigned',
  'in_review',
  'resolved',
  'closed',
]);

export const FraudMediumSchema = z.enum([
  'cash',
  'cheque',
  'upi',
  'bank_transfer',
  'other',
]);

export const TicketSourceSchema = z.enum([
  'web',
  'mobile',
  'api',
  'agent_assisted',
]);

export const UrgencyLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const TeamSizeRecommendationSchema = z.enum([
  'individual',
  'small_team',
  'full_team',
]);
