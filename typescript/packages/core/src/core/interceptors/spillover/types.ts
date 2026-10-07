import { z } from 'zod';
import { SpilloverStore } from './spillover-store.interface.js';

export interface SpilloverEnvelope {
  _spillover: true;
  resourceUri: string;
  mimeType: string;
  sizeBytes: number;
  totalItems?: number;
  summary: string;
  preview: unknown;
  hint: string;
}

export const SpilloverEnvelopeSchema = z.object({
  _spillover: z.literal(true),
  resourceUri: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  totalItems: z.number().optional(),
  summary: z.string(),
  preview: z.unknown(),
  hint: z.string(),
});

export interface DataSpilloverOptions {
  /**
   * Maximum allowed payload size in bytes before spillover is triggered (default: 10KB = 10,240).
   */
  maxPayloadBytes?: number;
  /**
   * Time-to-live for spilled resources in seconds (default: 3,600 = 1 hour).
   */
  spilloverTtlSeconds?: number;
  /**
   * Storage backend driver: 'memory' (default), 'filesystem', or custom SpilloverStore instance.
   */
  storage?: 'memory' | 'filesystem' | SpilloverStore;
  /**
   * Storage directory when using 'filesystem' driver.
   */
  storagePath?: string;
  /**
   * Number of items to include in the preview slice for arrays/maps (default: 3).
   */
  previewItems?: number;
  /**
   * Number of characters to include in string preview (default: 500).
   */
  previewStringChars?: number;
  /**
   * URI prefix for generated resource pointers (default: 'resource://data-spillover/').
   */
  resourceUriPrefix?: string;
}
