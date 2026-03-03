import { jest, describe, it, expect } from '@jest/globals';
import {
    generateCodeVerifier,
    generateCodeChallenge,
    generatePKCEParams,
    verifyPKCE,
    isValidCodeVerifier,
    validatePKCESupport
} from '../pkce.js';

describe('PKCE Utilities', () => {
    describe('generateCodeVerifier', () => {
        it('should generate a valid code verifier', () => {
            const verifier = generateCodeVerifier();
            expect(typeof verifier).toBe('string');
            expect(verifier.length).toBeGreaterThanOrEqual(43);
            expect(verifier.length).toBeLessThanOrEqual(128);
            expect(isValidCodeVerifier(verifier)).toBe(true);
        });

        it('should be unique', () => {
            const v1 = generateCodeVerifier();
            const v2 = generateCodeVerifier();
            expect(v1).not.toBe(v2);
        });
    });

    describe('generateCodeChallenge', () => {
        it('should generate a valid S256 challenge', () => {
            const verifier = 'test-verifier-1234567890-1234567890-1234567890';
            const challenge = generateCodeChallenge(verifier, 'S256');
            expect(typeof challenge).toBe('string');
            expect(challenge.length).toBeGreaterThan(0);
            const challenge2 = generateCodeChallenge(verifier, 'S256');
            expect(challenge).toBe(challenge2);
        });

        it('should support plain method', () => {
            const verifier = 'test-verifier';
            const challenge = generateCodeChallenge(verifier, 'plain');
            expect(challenge).toBe(verifier);
        });

        it('should default to S256 method', () => {
            const verifier = 'test-verifier-1234567890-1234567890-1234567890';
            const challenge = generateCodeChallenge(verifier);
            const challengeExplicit = generateCodeChallenge(verifier, 'S256');
            expect(challenge).toBe(challengeExplicit);
        });
    });

    describe('generatePKCEParams', () => {
        it('should generate complete PKCE params with S256', () => {
            const params = generatePKCEParams('S256');

            expect(params.code_verifier).toBeDefined();
            expect(params.code_challenge).toBeDefined();
            expect(params.code_challenge_method).toBe('S256');
            expect(isValidCodeVerifier(params.code_verifier)).toBe(true);
            expect(verifyPKCE(params.code_verifier, params.code_challenge, 'S256')).toBe(true);
        });

        it('should generate complete PKCE params with plain', () => {
            const params = generatePKCEParams('plain');

            expect(params.code_verifier).toBe(params.code_challenge);
            expect(params.code_challenge_method).toBe('plain');
        });

        it('should default to S256', () => {
            const params = generatePKCEParams();
            expect(params.code_challenge_method).toBe('S256');
        });
    });

    describe('verifyPKCE', () => {
        it('should verify correct challenge', () => {
            const verifier = generateCodeVerifier();
            const challenge = generateCodeChallenge(verifier, 'S256');
            expect(verifyPKCE(verifier, challenge, 'S256')).toBe(true);
        });

        it('should fail strict S256 verification if mismatched', () => {
            const verifier = generateCodeVerifier();
            const otherVerifier = generateCodeVerifier();
            const challenge = generateCodeChallenge(otherVerifier, 'S256');
            expect(verifyPKCE(verifier, challenge, 'S256')).toBe(false);
        });

        it('should verify plain method', () => {
            const verifier = 'test-plain-verifier-1234567890-1234567890-123';
            const challenge = generateCodeChallenge(verifier, 'plain');
            expect(verifyPKCE(verifier, challenge, 'plain')).toBe(true);
        });
    });

    describe('isValidCodeVerifier', () => {
        it('should reject verifiers that are too short', () => {
            expect(isValidCodeVerifier('short')).toBe(false);
            expect(isValidCodeVerifier('a'.repeat(42))).toBe(false);
        });

        it('should reject verifiers that are too long', () => {
            expect(isValidCodeVerifier('a'.repeat(129))).toBe(false);
        });

        it('should accept valid length verifiers', () => {
            expect(isValidCodeVerifier('a'.repeat(43))).toBe(true);
            expect(isValidCodeVerifier('a'.repeat(128))).toBe(true);
        });

        it('should accept valid characters', () => {
            expect(isValidCodeVerifier('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq')).toBe(true);
            expect(isValidCodeVerifier('0123456789-._~0123456789-._~0123456789-._~ab')).toBe(true);
        });

        it('should reject invalid characters', () => {
            expect(isValidCodeVerifier('a'.repeat(42) + '!')).toBe(false);
            expect(isValidCodeVerifier('a'.repeat(42) + '@')).toBe(false);
            expect(isValidCodeVerifier('a'.repeat(42) + ' ')).toBe(false);
        });
    });

    describe('validatePKCESupport', () => {
        it('should return false if empty', () => {
            expect(validatePKCESupport([])).toBe(false);
            expect(validatePKCESupport(undefined)).toBe(false);
        });

        it('should require S256', () => {
            expect(validatePKCESupport(['plain'])).toBe(false);
            expect(validatePKCESupport(['S256'])).toBe(true);
            expect(validatePKCESupport(['plain', 'S256'])).toBe(true);
        });
    });
});
