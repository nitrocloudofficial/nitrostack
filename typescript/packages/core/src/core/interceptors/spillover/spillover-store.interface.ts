export interface SpilloverRecord {
  id: string;
  data: string; // Serialized JSON or raw text
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
  expiresAt: number;
  /** Session that produced the payload. Absent for stateless writes. */
  sessionId?: string;
}

export interface SpilloverStore {
  save(id: string, data: string, mimeType: string, ttlSeconds: number, sessionId?: string): Promise<SpilloverRecord>;
  get(id: string): Promise<SpilloverRecord | undefined>;
  delete(id: string): Promise<boolean>;
  cleanup(): Promise<number>; // Returns count of pruned records
  dispose(): Promise<void>;
}
