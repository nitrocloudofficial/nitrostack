/**
 * Zero-Knowledge Privacy Layer — Aegis Protocol
 *
 * Implements cryptographic primitives for the ZK threat fusion pipeline:
 *   - SHA-256 HMAC hashing of PII (phone numbers, account IDs)
 *   - Pedersen-style commitment scheme (SHA-256 based)
 *   - PII masking for display
 *   - ZK audit trail entries
 *
 * These utilities ensure that raw identifiers never cross MCP server
 * boundaries. Only hashed commitments are transmitted between the
 * Telecom Air-Gapped MCP Server and the Bank & Gov Secure MCP Server.
 */

import { createHmac, createHash, randomBytes } from 'crypto';

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

/** Default HMAC salt — in production, sourced from HSM / Vault */
const DEFAULT_SALT = process.env.ZK_HMAC_SALT || 'aegis-zk-fusion-salt-v1';

// ─────────────────────────────────────────────────────────────
// Core Hashing
// ─────────────────────────────────────────────────────────────

/**
 * Hash an identifier (phone number, account ID) using SHA-256 HMAC.
 * The same input + salt always produces the same hash, allowing
 * cross-reference without exposing raw PII.
 */
export function hashIdentifier(value: string, salt: string = DEFAULT_SALT): string {
  return createHmac('sha256', salt).update(value).digest('hex');
}

// ─────────────────────────────────────────────────────────────
// Pedersen-Style Commitment Scheme (SHA-256 based)
// ─────────────────────────────────────────────────────────────

export interface ZkCommitment {
  commitment: string;   // SHA-256(data || blinding_factor)
  blinding: string;     // Random blinding factor (hex)
}

/**
 * Generate a cryptographic commitment for a data payload.
 *
 *   commitment = SHA-256(data || blinding_factor)
 *
 * The blinding factor is randomly generated per commitment,
 * ensuring that commitments are hiding (no information leak)
 * and binding (cannot be opened to a different value).
 */
export function generateCommitment(data: string): ZkCommitment {
  const blinding = randomBytes(32).toString('hex');
  const commitment = createHash('sha256')
    .update(data + blinding)
    .digest('hex');

  return { commitment, blinding };
}

/**
 * Verify a commitment by recomputing SHA-256(data || blinding)
 * and comparing against the stored commitment hash.
 */
export function verifyCommitment(
  data: string,
  commitment: string,
  blinding: string
): boolean {
  const recomputed = createHash('sha256')
    .update(data + blinding)
    .digest('hex');

  return recomputed === commitment;
}

// ─────────────────────────────────────────────────────────────
// PII Masking
// ─────────────────────────────────────────────────────────────

/**
 * Mask PII for safe display/logging.
 *
 * Examples:
 *   "+91-9876543210"  → "+91-****3210"
 *   "ACC-4492-HDFC"   → "ACC-****-HDFC"
 *   "SBI-MULE-4482"   → "SBI-****-4482"
 */
export function maskPII(value: string): string {
  if (!value || value.length < 4) return '****';

  // Phone number pattern: +XX-XXXXXXXXXX
  const phoneMatch = value.match(/^(\+\d{1,3}-)(\d+)(\d{4})$/);
  if (phoneMatch) {
    return `${phoneMatch[1]}${'*'.repeat(phoneMatch[2].length)}${phoneMatch[3]}`;
  }

  // Account pattern: PREFIX-XXXX-SUFFIX or PREFIX-XXXX
  const parts = value.split('-');
  if (parts.length >= 3) {
    const masked = parts.map((part, i) => {
      if (i === 0 || i === parts.length - 1) return part;
      return '****';
    });
    return masked.join('-');
  }

  // Generic: show first 3 and last 3
  if (value.length > 6) {
    return value.slice(0, 3) + '****' + value.slice(-3);
  }

  return '****' + value.slice(-2);
}

// ─────────────────────────────────────────────────────────────
// ZK Audit Trail
// ─────────────────────────────────────────────────────────────

export interface ZkAuditEntry {
  timestamp: string;
  operation: string;
  source_server: string;
  identifier_hash: string;
  commitment: string;
  verified: boolean;
  privacy_level: 'ZK_FULL' | 'ZK_PARTIAL' | 'PLAINTEXT';
}

/**
 * Create a ZK audit log entry recording that a privacy-preserving
 * verification was performed across an MCP server boundary.
 */
export function createZkAuditEntry(
  operation: string,
  sourceServer: string,
  rawIdentifier: string,
  commitment: ZkCommitment
): ZkAuditEntry {
  return {
    timestamp: new Date().toISOString(),
    operation,
    source_server: sourceServer,
    identifier_hash: hashIdentifier(rawIdentifier),
    commitment: commitment.commitment,
    verified: true,
    privacy_level: 'ZK_FULL',
  };
}
