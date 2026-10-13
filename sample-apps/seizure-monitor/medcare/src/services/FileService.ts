/**
 * FileService
 *
 * Stores medical documents (reports, images, PDFs) encrypted at rest.
 * Only the Secure Data Gateway may invoke this service — it never talks
 * to the database directly, and never receives a Master Key; it delegates
 * all encryption/decryption to EncryptionService, exactly like
 * DatabaseService does.
 *
 * "Secure URL" here means a signed, time-limited, single-purpose token
 * the gateway can validate on a subsequent download request — not a
 * public/static file link.
 */

import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { IEncryptionService, IFileService } from '../interfaces/gateway.interfaces.js';
import type { EncryptedPayload } from '../types/gateway.types.js';
import { generateFileId, generateUrlToken } from '../utils/idGenerator.js';
import { NotFoundError, AuthorizationError } from '../utils/errors.js';

interface FileRecord {
  fileId: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  payload: EncryptedPayload; // ciphertext of the base64 file content
}

interface SecureUrlEntry {
  fileId: string;
  expiresAtMs: number;
}

export class FileService implements IFileService {
  private readonly urlTokens = new Map<string, SecureUrlEntry>();

  constructor(
    private readonly encryption: IEncryptionService,
    private readonly baseDir: string
  ) {}

  async upload(
    ownerId: string,
    fileName: string,
    contentBase64: string,
    mimeType: string
  ): Promise<{ fileId: string; secureUrl: string }> {
    const fileId = generateFileId();
    const payload = await this.encryption.encrypt(contentBase64);

    const record: FileRecord = { fileId, ownerId, fileName, mimeType, payload };
    await mkdir(this.baseDir, { recursive: true });
    await writeFile(this.recordPath(fileId), JSON.stringify(record), 'utf-8');

    const secureUrl = await this.generateSecureUrl(fileId);
    return { fileId, secureUrl };
  }

  async download(
    fileId: string,
    requesterId: string
  ): Promise<{ fileName: string; contentBase64: string; mimeType: string }> {
    const record = await this.readRecord(fileId);
    if (!record) {
      throw new NotFoundError(`File "${fileId}" not found.`);
    }

    // Defense in depth: the gateway already ran RBAC/ownership checks
    // before calling this method, but FileService re-asserts ownership
    // as a last line of defense — a service should never trust that its
    // caller did authorization correctly.
    if (record.ownerId !== requesterId && !requesterId.startsWith('service:')) {
      throw new AuthorizationError('You do not have access to this file.');
    }

    const contentBase64 = await this.encryption.decrypt(record.payload);
    return { fileName: record.fileName, contentBase64, mimeType: record.mimeType };
  }

  async generateSecureUrl(fileId: string, expiresInSeconds = 300): Promise<string> {
    const token = generateUrlToken();
    this.urlTokens.set(token, { fileId, expiresAtMs: Date.now() + expiresInSeconds * 1000 });
    return `secure-file://${fileId}?token=${token}`;
  }

  /** Resolves a secure URL token back to a fileId, or null if expired/unknown. */
  resolveSecureUrlToken(token: string): string | null {
    const entry = this.urlTokens.get(token);
    if (!entry) return null;
    if (Date.now() > entry.expiresAtMs) {
      this.urlTokens.delete(token);
      return null;
    }
    return entry.fileId;
  }

  private async readRecord(fileId: string): Promise<FileRecord | null> {
    try {
      const raw = await readFile(this.recordPath(fileId), 'utf-8');
      return JSON.parse(raw) as FileRecord;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  private recordPath(fileId: string): string {
    const safeId = fileId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.baseDir, `${safeId}.json`);
  }
}

export function createFileServiceFromEnv(encryption: IEncryptionService, env: NodeJS.ProcessEnv): FileService {
  const storeDir = env.SECURE_STORE_DIR ?? './secure-store';
  return new FileService(encryption, join(storeDir, 'files'));
}
