/**
 * EncryptionService
 *
 * All sensitive healthcare data at rest is protected with AES-256-GCM
 * using a per-record data key derived (HKDF) from the active master key
 * plus a random salt, and a random 96-bit nonce per encryption.
 *
 * Only the Secure Data Gateway constructs and holds this service — it is
 * the sole caller of KeyManagementService, and no plaintext or key
 * material returned by it should ever cross into an AI agent, File
 * Service, or User Service.
 */

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';
import argon2 from 'argon2';
import type { IEncryptionService, IKeyManagementService } from '../interfaces/gateway.interfaces.js';
import type { EncryptedPayload } from '../types/gateway.types.js';
import { wipeBuffer } from '../utils/secureMemory.js';

const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12; // 96-bit, recommended for GCM
const SALT_BYTES = 16;
const HKDF_INFO = Buffer.from('family-medcare-gateway:data-key:v1');

export class EncryptionService implements IEncryptionService {
  constructor(private readonly keyManagement: IKeyManagementService) {}

  async encrypt(plaintext: string): Promise<EncryptedPayload> {
    const { key: masterKey, version } = await this.keyManagement.getActiveMasterKey();

    const salt = randomBytes(SALT_BYTES);
    const nonce = randomBytes(NONCE_BYTES);
    const dataKey = this.deriveDataKey(masterKey, salt);

    try {
      const cipher = createCipheriv(ALGORITHM, dataKey, nonce);
      const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return {
        ciphertext: ciphertext.toString('base64'),
        nonce: nonce.toString('base64'),
        authTag: authTag.toString('base64'),
        salt: salt.toString('base64'),
        keyVersion: version,
        algorithm: 'AES-256-GCM'
      };
    } finally {
      wipeBuffer(dataKey);
    }
  }

  async decrypt(payload: EncryptedPayload): Promise<string> {
    const { key: masterKey } = await this.keyManagement.getMasterKeyByVersion(payload.keyVersion);

    const salt = Buffer.from(payload.salt, 'base64');
    const nonce = Buffer.from(payload.nonce, 'base64');
    const authTag = Buffer.from(payload.authTag, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');
    const dataKey = this.deriveDataKey(masterKey, salt);

    try {
      const decipher = createDecipheriv(ALGORITHM, dataKey, nonce);
      decipher.setAuthTag(authTag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return plaintext.toString('utf-8');
    } catch {
      // Do not leak crypto internals (padding/tag details) to callers.
      throw new Error('Decryption failed: payload is corrupt, tampered with, or uses an unknown key.');
    } finally {
      wipeBuffer(dataKey);
    }
  }

  async hashSecret(secret: string, salt?: Buffer): Promise<{ hash: string; salt: string }> {
    const usedSalt = salt ?? randomBytes(SALT_BYTES);
    const hash = await argon2.hash(secret, {
      type: argon2.argon2id,
      salt: usedSalt,
      hashLength: 32,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1
    });
    return { hash, salt: usedSalt.toString('base64') };
  }

  async verifySecret(secret: string, hash: string, _salt?: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, secret);
    } catch {
      return false;
    }
  }

  /**
   * Derives a one-time-use 256-bit data key from the master key using
   * HKDF-SHA256, scoped by the record's random salt. This means a
   * compromise of one record's derived key never reveals the master key
   * or any other record's key.
   */
  private deriveDataKey(masterKey: Buffer, salt: Buffer): Buffer {
    const derived = hkdfSync('sha256', masterKey, salt, HKDF_INFO, 32);
    return Buffer.from(derived);
  }
}
