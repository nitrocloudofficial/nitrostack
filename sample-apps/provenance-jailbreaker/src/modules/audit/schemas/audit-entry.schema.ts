import { Schema, model, type Document } from 'mongoose';

/**
 * AuditEntry — one link in the tamper-evident hash chain.
 *
 * Each entry's `hash` is computed from its own content plus `prevHash`
 * (the hash of the entry immediately before it in `sequence` order).
 * Mutating any entry's stored fields after the fact breaks the chain
 * because the recomputed hash will no longer match `hash`, and/or the
 * next entry's `prevHash` will no longer match this entry's `hash`.
 */
export interface AuditEntryDocument extends Document {
  sequence: number;
  timestamp: string;
  action: string;
  actor: string;
  scope: string;
  toolCall: {
    name: string;
    args: Record<string, unknown>;
  };
  result: {
    authorized: boolean;
    confidence?: number;
    evidence?: string;
  };
  hash: string;
  prevHash: string;
}

const AuditEntrySchema = new Schema<AuditEntryDocument>(
  {
    sequence: { type: Number, required: true, unique: true, index: true },
    timestamp: { type: String, required: true },
    action: { type: String, required: true },
    actor: { type: String, required: true },
    scope: { type: String, required: true },
    toolCall: {
      name: { type: String, required: true },
      args: { type: Schema.Types.Mixed, default: {} }
    },
    result: {
      authorized: { type: Boolean, required: true },
      confidence: { type: Number },
      evidence: { type: String }
    },
    hash: { type: String, required: true },
    prevHash: { type: String, required: true }
  },
  {
    collection: 'audit_entries',
    versionKey: false,
    timestamps: false
  }
);

export const AuditEntryModel = model<AuditEntryDocument>('AuditEntry', AuditEntrySchema);
