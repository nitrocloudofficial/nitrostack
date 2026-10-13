/**
 * ID Generation Utilities
 *
 * Centralized so every service generates IDs the same way — avoids
 * duplicated `crypto.randomUUID()` calls scattered across the codebase.
 */

import { randomUUID, randomBytes } from 'crypto';

export function generateRequestId(): string {
  return `req_${randomUUID()}`;
}

export function generateSessionId(): string {
  return `sess_${randomUUID()}`;
}

export function generateFileId(): string {
  return `file_${randomUUID()}`;
}

/** Short random token, e.g. for signed/secure download URLs. */
export function generateUrlToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}
