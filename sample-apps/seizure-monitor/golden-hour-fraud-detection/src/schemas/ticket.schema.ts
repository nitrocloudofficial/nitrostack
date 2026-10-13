import { z } from 'zod';
import {
  FraudMediumSchema,
  Iso4217CurrencySchema,
  Iso8601TimestampSchema,
  TicketSourceSchema,
  TicketStatusSchema,
  UuidSchema,
} from './common.js';

export const VictimSchema = z.object({
  full_name: z.string().min(1),
  contact_number: z.string().min(1),
  email: z.string().email().optional(),
  address: z.string().min(1),
  /** Field-level encrypted at rest. */
  id_proof_type: z.string().min(1),
  /** Field-level encrypted at rest. */
  id_proof_number: z.string().min(1),
});

export const FraudsterSchema = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    bank_account: z.string().optional(),
    upi_id: z.string().optional(),
    ifsc: z.string().optional(),
    address: z.string().optional(),
  })
  .strict();

export const FraudDetailsSchema = z.object({
  /** Drives the revocability check (§7.1). */
  timestamp: Iso8601TimestampSchema,
  medium: FraudMediumSchema,
  subject: z.string().max(150),
  description: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: Iso4217CurrencySchema,
});

export const RegionSchema = z.object({
  country: z.string().min(1),
  state: z.string().min(1),
  /** Drives which legal corpus Agent 3 queries. */
  jurisdiction_code: z.string().min(1),
});

export const TicketAttachmentSchema = z.object({
  file_id: UuidSchema,
  type: z.string().min(1),
  storage_url: z.string().url(),
  uploaded_at: Iso8601TimestampSchema,
});

export const TicketMetadataSchema = z.object({
  source: TicketSourceSchema,
  /** Hashed IP address — raw IPs must not be stored (§11). */
  ip_hash: z.string().min(1),
});

export const TicketSchema = z.object({
  ticket_id: UuidSchema,
  created_at: Iso8601TimestampSchema,
  status: TicketStatusSchema,
  victim: VictimSchema,
  fraud: FraudDetailsSchema,
  fraudster: FraudsterSchema.optional(),
  region: RegionSchema,
  attachments: z.array(TicketAttachmentSchema).default([]),
  metadata: TicketMetadataSchema,
});

/** Input for submitting a new ticket (server assigns id, timestamps, and status). */
export const CreateTicketInputSchema = TicketSchema.omit({
  ticket_id: true,
  created_at: true,
  status: true,
});

export type Victim = z.infer<typeof VictimSchema>;
export type Fraudster = z.infer<typeof FraudsterSchema>;
export type FraudDetails = z.infer<typeof FraudDetailsSchema>;
export type Region = z.infer<typeof RegionSchema>;
export type TicketAttachment = z.infer<typeof TicketAttachmentSchema>;
export type TicketMetadata = z.infer<typeof TicketMetadataSchema>;
export type Ticket = z.infer<typeof TicketSchema>;
export type CreateTicketInput = z.infer<typeof CreateTicketInputSchema>;
