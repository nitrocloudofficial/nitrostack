import crypto from 'crypto';
import { PKCEParams } from './types.js';

// Re-export PKCEParams for convenience
export type { PKCEParams } from './types.js';

/**
 * PKCE (Proof Key for Code Exchange) Utilities
 * Implements RFC 7636
 * 
 * PKCE is REQUIRED by OAuth 2.1 to prevent authorization code interception attacks
 */

/**
 * Generate a cryptographically secure random code verifier
 * 
 * Per RFC 7636:
 * - code_verifier = high-entropy cryptographic random STRING
 * - using unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 * - minimum length of 43 characters and maximum length of 128 characters
 */
export function generateCodeVerifier(): string {
  // Generate 32 random bytes (256 bits of entropy)
  const randomBytes = crypto.randomBytes(32);
  
  // Convert to base64url encoding (URL-safe base64 without padding)
  return base64URLEncode(randomBytes);
}

/**
 * Generate code challenge from code verifier
 * 
 * @param codeVerifier - The code verifier string
 * @param method - Challenge method: 'S256' (SHA-256) or 'plain'
 */
export function generateCodeChallenge(
  codeVerifier: string,
  method: 'S256' | 'plain' = 'S256'
): string {
  if (method === 'plain') {
    // Plain method: code_challenge = code_verifier
    // NOT RECOMMENDED - only for constrained environments
    return codeVerifier;
  }
  
  // S256 method (REQUIRED by OAuth 2.1 when technically capable):
  // code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
  const hash = crypto
    .createHash('sha256')
    .update(codeVerifier, 'ascii')
    .digest();
  
  return base64URLEncode(hash);
}

/**
 * Generate complete PKCE parameters
 * 
 * @param method - Challenge method (defaults to S256 as required by OAuth 2.1)
 * @returns PKCEParams with verifier and challenge
 */
export function generatePKCEParams(method: 'S256' | 'plain' = 'S256'): PKCEParams {
  const code_verifier = generateCodeVerifier();
  const code_challenge = generateCodeChallenge(code_verifier, method);
  
  return {
    code_verifier,
    code_challenge,
    code_challenge_method: method,
  };
}

/**
 * Verify PKCE challenge
 * Used by authorization servers to verify the code_verifier matches the code_challenge
 * 
 * @param codeVerifier - The code verifier from token request
 * @param codeChallenge - The code challenge from authorization request
 * @param method - The challenge method used
 * @returns true if verification succeeds
 */
export function verifyPKCE(
  codeVerifier: string,
  codeChallenge: string,
  method: 'S256' | 'plain'
): boolean {
  const computedChallenge = generateCodeChallenge(codeVerifier, method);
  return computedChallenge === codeChallenge;
}

/**
 * Convert buffer to base64url encoding
 * Base64url is URL-safe base64 without padding
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Validate code verifier format
 * Per RFC 7636: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 * Length: 43-128 characters
 */
export function isValidCodeVerifier(verifier: string): boolean {
  if (verifier.length < 43 || verifier.length > 128) {
    return false;
  }
  
  const validPattern = /^[A-Za-z0-9\-._~]+$/;
  return validPattern.test(verifier);
}

/**
 * Validate PKCE method support
 * OAuth 2.1 REQUIRES S256 when technically capable
 */
export function validatePKCESupport(
  supportedMethods: string[] | undefined
): boolean {
  if (!supportedMethods || supportedMethods.length === 0) {
    // No PKCE support indicated - MUST refuse to proceed
    return false;
  }
  
  // MUST support S256
  return supportedMethods.includes('S256');
}

