import { Injectable } from '@nitrostack/core';
import crypto from 'crypto';

/**
 * AES-256-GCM encrypted, in-memory-only store for original↔token mappings.
 *
 * Design constraints from the Phalanx spec:
 *  - The mapping never touches disk and never leaves the process.
 *  - The plaintext map is not held as a live object; it is encrypted at rest in
 *    RAM and decrypted only for the final report reconstruction step.
 *  - The key is generated per process. Restarting the server makes every prior
 *    session's map permanently unrecoverable, which is the desired failure mode.
 */
@Injectable()
export class SessionVaultService {
  private readonly masterKey = crypto.randomBytes(32);
  private readonly store = new Map<string, { iv: Buffer; tag: Buffer; data: Buffer; createdAt: number }>();
  private readonly ttlMs = Number(process.env.PHALANX_SESSION_TTL_MS ?? 60 * 60 * 1000);

  /** Encrypt and store a token map under a session id. Overwrites any prior map. */
  put(sessionId: string, tokenMap: Record<string, string>): void {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    // The session id is bound as AAD so a ciphertext cannot be replayed under a
    // different session id.
    cipher.setAAD(Buffer.from(sessionId, 'utf8'));

    const data = Buffer.concat([
      cipher.update(JSON.stringify(tokenMap), 'utf8'),
      cipher.final()
    ]);

    this.store.set(sessionId, { iv, tag: cipher.getAuthTag(), data, createdAt: Date.now() });
    this.evictExpired();
  }

  /** Merge additional entries into an existing session map (re-encrypts in place). */
  merge(sessionId: string, extra: Record<string, string>): void {
    const existing = this.get(sessionId) ?? {};
    this.put(sessionId, { ...existing, ...extra });
  }

  /** Decrypt and return the token map, or null if absent/expired/tampered. */
  get(sessionId: string): Record<string, string> | null {
    const entry = this.store.get(sessionId);
    if (!entry) return null;

    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.destroy(sessionId);
      return null;
    }

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, entry.iv);
      decipher.setAAD(Buffer.from(sessionId, 'utf8'));
      decipher.setAuthTag(entry.tag);
      const plaintext = Buffer.concat([decipher.update(entry.data), decipher.final()]).toString('utf8');
      return JSON.parse(plaintext) as Record<string, string>;
    } catch {
      // Auth tag mismatch — treat as compromised and drop it.
      this.destroy(sessionId);
      return null;
    }
  }

  has(sessionId: string): boolean {
    return this.store.has(sessionId);
  }

  /** Zero the ciphertext buffers before dropping the reference. */
  destroy(sessionId: string): void {
    const entry = this.store.get(sessionId);
    if (entry) {
      entry.data.fill(0);
      entry.iv.fill(0);
      entry.tag.fill(0);
    }
    this.store.delete(sessionId);
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.store.entries()) {
      if (now - entry.createdAt > this.ttlMs) this.destroy(id);
    }
  }
}
