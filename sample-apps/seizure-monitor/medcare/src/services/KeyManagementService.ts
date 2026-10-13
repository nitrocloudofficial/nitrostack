/**
 * KeyManagementService
 *
 * Owns the Hybrid Master Key Architecture:
 *
 *   MASTER_KEY_PASSPHRASE (env / secret manager in production)
 *          │  Argon2id (random salt, high work factor)
 *          ▼
 *     Master Key (AES-256, per key-version)
 *          │  held ONLY inside this service, in memory
 *          ▼
 *   handed to EncryptionService for AES-256-GCM data-key derivation
 *
 * Only the Secure Data Gateway (via EncryptionService) may call this
 * service. No AI agent, File Service, or User Service may import it.
 *
 * Key rotation: bump MASTER_KEY_VERSION and provide the previous
 * passphrase via `previousPassphrases` so historical records encrypted
 * under an old key version can still be decrypted.
 */

import argon2 from 'argon2';
import type { IKeyManagementService } from '../interfaces/gateway.interfaces.js';
import type { KeyMaterial } from '../types/gateway.types.js';

interface KeyManagementConfig {
  /** Current passphrase used to derive the active master key. */
  activePassphrase: string;
  /** Current key version label (e.g. "v1"). */
  activeVersion: string;
  /**
   * Fixed, non-secret salt bound to a key version. In production this
   * should come from a secrets manager alongside the passphrase, not be
   * regenerated at random on every boot — otherwise the derived key
   * changes every restart and nothing already encrypted can be read.
   */
  versionSalts?: Record<string, string>;
  /** Passphrases for previous key versions, keyed by version label. */
  previousPassphrases?: Record<string, string>;
}

export class KeyManagementService implements IKeyManagementService {
  private readonly cache = new Map<string, KeyMaterial>();

  constructor(private readonly config: KeyManagementConfig) {
    if (!config.activePassphrase || config.activePassphrase.length < 16) {
      throw new Error(
        'KeyManagementService: MASTER_KEY_PASSPHRASE must be set and at least 16 characters.'
      );
    }
  }

  getCurrentKeyVersion(): string {
    return this.config.activeVersion;
  }

  async getActiveMasterKey(): Promise<KeyMaterial> {
    return this.deriveKey(this.config.activeVersion, this.config.activePassphrase);
  }

  async getMasterKeyByVersion(version: string): Promise<KeyMaterial> {
    if (version === this.config.activeVersion) {
      return this.getActiveMasterKey();
    }
    const passphrase = this.config.previousPassphrases?.[version];
    if (!passphrase) {
      throw new Error(`KeyManagementService: no passphrase registered for key version "${version}".`);
    }
    return this.deriveKey(version, passphrase);
  }

  // -------------------------------------------------------------------------
  // Internal: Argon2id key derivation, memoized per version
  // -------------------------------------------------------------------------

  private async deriveKey(version: string, passphrase: string): Promise<KeyMaterial> {
    const cached = this.cache.get(version);
    if (cached) return cached;

    const saltSource = this.config.versionSalts?.[version] ?? `family-medcare-gateway::${version}`;
    const salt = Buffer.from(saltSource, 'utf-8');

    // Argon2id, tuned for interactive server-side use (not a login form):
    // higher memory cost than the OWASP minimum since this runs rarely
    // (once per key version, then cached in memory for process lifetime).
    const raw = await argon2.hash(passphrase, {
      type: argon2.argon2id,
      salt,
      hashLength: 32, // 256-bit key for AES-256
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 4,
      parallelism: 1,
      raw: true
    });

    const material: KeyMaterial = { key: Buffer.from(raw), version };
    this.cache.set(version, material);
    return material;
  }
}

/** Builds a KeyManagementService from process.env, with sane validation. */
export function createKeyManagementServiceFromEnv(env: NodeJS.ProcessEnv): KeyManagementService {
  const activePassphrase = env.MASTER_KEY_PASSPHRASE ?? '';
  const activeVersion = env.MASTER_KEY_VERSION ?? 'v1';
  return new KeyManagementService({ activePassphrase, activeVersion });
}
