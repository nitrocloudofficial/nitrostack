import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { StoredToken } from './types.js';

/**
 * Token Storage Interface
 * 
 * Provides secure storage for OAuth tokens
 */
export interface TokenStore {
  /**
   * Save a token
   */
  saveToken(key: string, token: StoredToken): Promise<void>;

  /**
   * Get a token
   */
  getToken(key: string): Promise<StoredToken | null>;

  /**
   * Delete a token
   */
  deleteToken(key: string): Promise<void>;

  /**
   * List all stored token keys
   */
  listKeys(): Promise<string[]>;

  /**
   * Clear all tokens
   */
  clear(): Promise<void>;
}

/**
 * In-memory token store
 * For testing and ephemeral storage
 */
export class MemoryTokenStore implements TokenStore {
  private tokens: Map<string, StoredToken> = new Map();

  async saveToken(key: string, token: StoredToken): Promise<void> {
    this.tokens.set(key, token);
  }

  async getToken(key: string): Promise<StoredToken | null> {
    const token = this.tokens.get(key);
    if (!token) return null;

    // Check if expired
    if (this.isTokenExpired(token)) {
      this.tokens.delete(key);
      return null;
    }

    return token;
  }

  async deleteToken(key: string): Promise<void> {
    this.tokens.delete(key);
  }

  async listKeys(): Promise<string[]> {
    return Array.from(this.tokens.keys());
  }

  async clear(): Promise<void> {
    this.tokens.clear();
  }

  private isTokenExpired(token: StoredToken): boolean {
    return Date.now() > token.expires_at;
  }
}

/**
 * File-based token store with encryption
 * For CLI applications and development
 */
export class FileTokenStore implements TokenStore {
  private storePath: string;
  private encryptionKey?: string;

  constructor(storePath: string, encryptionKey?: string) {
    this.storePath = storePath;
    this.encryptionKey = encryptionKey;
  }

  async saveToken(key: string, token: StoredToken): Promise<void> {
    const tokens = await this.loadTokens();
    tokens[key] = token;
    await this.saveTokens(tokens);
  }

  async getToken(key: string): Promise<StoredToken | null> {
    const tokens = await this.loadTokens();
    const token = tokens[key];

    if (!token) return null;

    // Check if expired
    if (this.isTokenExpired(token)) {
      delete tokens[key];
      await this.saveTokens(tokens);
      return null;
    }

    return token;
  }

  async deleteToken(key: string): Promise<void> {
    const tokens = await this.loadTokens();
    delete tokens[key];
    await this.saveTokens(tokens);
  }

  async listKeys(): Promise<string[]> {
    const tokens = await this.loadTokens();
    return Object.keys(tokens);
  }

  async clear(): Promise<void> {
    await this.saveTokens({});
  }

  /**
   * Load tokens from file
   */
  private async loadTokens(): Promise<Record<string, StoredToken>> {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.storePath), { recursive: true });

      // Read file
      const data = await fs.readFile(this.storePath, 'utf-8');

      // Decrypt if encryption is enabled
      const content = this.decrypt(data);

      return JSON.parse(content);
    } catch (error: unknown) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {}; // File doesn't exist yet
      }
      throw error;
    }
  }

  /**
   * Save tokens to file
   */
  private async saveTokens(tokens: Record<string, StoredToken>): Promise<void> {
    const content = JSON.stringify(tokens, null, 2);

    // Encrypt if encryption is enabled
    const data = this.encrypt(content);

    // Write to file with restricted permissions
    await fs.writeFile(this.storePath, data, {
      mode: 0o600, // Read/write for owner only
    });
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) return data;

    const key = this.deriveKey(this.encryptionKey);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(data: string): string {
    if (!this.encryptionKey) return data;

    const key = this.deriveKey(this.encryptionKey);
    const parts = data.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Derive 256-bit key from password using PBKDF2
   */
  private deriveKey(password: string): Buffer {
    // Use a fixed salt for key derivation
    // In production, consider using a per-user salt
    const salt = 'nitrostack-token-store';
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }

  private isTokenExpired(token: StoredToken): boolean {
    return Date.now() > token.expires_at;
  }
}

/**
 * Create default token store
 * 
 * Uses file-based storage with encryption if password provided
 * 
 * @param storePath - Path to store tokens (default: ~/.nitrostack/tokens.json)
 * @param encryptionKey - Optional encryption key
 */
export function createDefaultTokenStore(
  storePath?: string,
  encryptionKey?: string
): TokenStore {
  const defaultPath = storePath || getDefaultStorePath();

  if (encryptionKey) {
    return new FileTokenStore(defaultPath, encryptionKey);
  }

  return new FileTokenStore(defaultPath);
}

/**
 * Get default token store path
 */
function getDefaultStorePath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.nitrostack', 'tokens.json');
}

/**
 * Utility: Check if token is expired
 */
export function isTokenExpired(token: StoredToken): boolean {
  return Date.now() > token.expires_at;
}

/**
 * Utility: Calculate token expiration timestamp
 */
export function calculateExpiration(expiresIn: number): number {
  return Date.now() + expiresIn * 1000;
}

/**
 * Utility: Convert TokenResponse to StoredToken
 */
export function tokenResponseToStored(
  response: { access_token: string; token_type: 'Bearer'; expires_in?: number; refresh_token?: string; scope?: string },
  resource?: string
): StoredToken {
  return {
    access_token: response.access_token,
    token_type: response.token_type,
    expires_at: response.expires_in ? calculateExpiration(response.expires_in) : Date.now() + 3600000, // Default 1 hour
    refresh_token: response.refresh_token,
    scope: response.scope,
    resource,
  };
}

