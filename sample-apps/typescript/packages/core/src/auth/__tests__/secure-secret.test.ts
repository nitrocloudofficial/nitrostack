import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SecretValue, isSecretValue, unwrapSecret } from '../secure-secret.js';

describe('Secure Secret', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        jest.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.restoreAllMocks();
    });

    describe('SecretValue constructor', () => {
        it('should throw if value is empty', () => {
            // @ts-ignore - testing private constructor or bypassed via fromValue
            expect(() => SecretValue.fromValue('', { allowHardcoded: true })).toThrow('Secret value cannot be empty');
        });

        it('should warn if secret is short', () => {
            SecretValue.fromValue('short', { allowHardcoded: true });
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('less than 16 characters'));
        });
    });

    describe('fromEnv', () => {
        it('should load from env variable', () => {
            process.env.TEST_SECRET = 'a-very-long-secret-value';
            const secret = SecretValue.fromEnv('TEST_SECRET');
            expect(secret.getValue()).toBe('a-very-long-secret-value');
            expect(secret.isFromEnvironment()).toBe(true);
        });

        it('should throw if env variable missing', () => {
            delete process.env.MISSING;
            expect(() => SecretValue.fromEnv('MISSING')).toThrow('is not set');
            expect(() => SecretValue.fromEnv('MISSING', { required: false })).toThrow('is not set');
        });
    });

    describe('fromValue', () => {
        it('should create from explicit value if allowed', () => {
            const secret = SecretValue.fromValue('manual-secret-value', { allowHardcoded: true });
            expect(secret.getValue()).toBe('manual-secret-value');
            expect(secret.isFromEnvironment()).toBe(false);
        });

        it('should throw if hardcoded not allowed', () => {
            expect(() => SecretValue.fromValue('fail')).toThrow('Hardcoded secrets are not allowed');
        });

        it('should warn in non-test environment and handle missing reason', () => {
            process.env.NODE_ENV = 'production';
            SecretValue.fromValue('manual-secret-value-long', { allowHardcoded: true, reason: 'Testing' });
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Testing'));

            SecretValue.fromValue('manual-secret-value-long', { allowHardcoded: true });
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Not specified'));
        });
    });

    describe('fromEnvOptional', () => {
        it('should return secret if exists', () => {
            process.env.OPT = 'opt-secret-value-long';
            expect(SecretValue.fromEnvOptional('OPT')?.getValue()).toBe('opt-secret-value-long');
        });

        it('should return undefined if missing', () => {
            expect(SecretValue.fromEnvOptional('MISSING_OPT')).toBeUndefined();
        });
    });

    describe('isSecretValue', () => {
        it('should correctly identify SecretValue', () => {
            const secret = SecretValue.fromValue('val'.repeat(6), { allowHardcoded: true });
            expect(isSecretValue(secret)).toBe(true);
            expect(isSecretValue('string')).toBe(false);
            expect(isSecretValue({})).toBe(false);
        });
    });

    describe('unwrapSecret', () => {
        it('should unwrap SecretValue', () => {
            const secret = SecretValue.fromValue('val'.repeat(6), { allowHardcoded: true });
            expect(unwrapSecret(secret)).toBe(secret.getValue());
        });

        it('should return string as-is', () => {
            expect(unwrapSecret('string')).toBe('string');
        });

        it('should warn in production for raw strings', () => {
            process.env.NODE_ENV = 'production';
            unwrapSecret('raw');
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Using raw string as secret'));
        });
    });

    describe('Representations', () => {
        const value = 'my-secret-value-long';
        const secret = SecretValue.fromValue(value, { allowHardcoded: true });

        it('should unwrap', () => {
            expect(secret.unwrap()).toBe(value);
        });

        it('should redact in toString', () => {
            expect(secret.toString()).toBe('[SecretValue: REDACTED]');
        });

        it('should redact in toJSON', () => {
            expect(secret.toJSON()).toBe('[SecretValue: REDACTED]');
        });

        it('should redact in util.inspect', () => {
            const inspect = (secret as any)[Symbol.for('nodejs.util.inspect.custom')]();
            expect(inspect).toContain('REDACTED');
            expect(inspect).not.toContain(value);
        });
    });
});
