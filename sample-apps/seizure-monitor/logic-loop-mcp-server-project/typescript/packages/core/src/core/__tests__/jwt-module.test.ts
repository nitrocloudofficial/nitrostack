import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { JWTModule } from '../jwt-module.js';

describe('JWTModule', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset config between tests
        (JWTModule as any).config = { secretEnvVar: 'JWT_SECRET', expiresIn: '24h' };
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('forRoot', () => {
        it('should merge config with defaults', () => {
            const result = JWTModule.forRoot({ secret: 'my-secret' });

            expect(result.secret).toBe('my-secret');
            expect(result.expiresIn).toBe('24h'); // Default preserved
        });

        it('should override defaults with provided config', () => {
            const result = JWTModule.forRoot({
                secret: 'my-secret',
                expiresIn: '7d',
                audience: 'my-app',
                issuer: 'my-issuer'
            });

            expect(result.expiresIn).toBe('7d');
            expect(result.audience).toBe('my-app');
            expect(result.issuer).toBe('my-issuer');
        });
    });

    describe('getConfig', () => {
        it('should return current config', () => {
            JWTModule.forRoot({ secret: 'test-secret' });

            const config = JWTModule.getConfig();
            expect(config.secret).toBe('test-secret');
        });
    });

    describe('getSecret', () => {
        it('should return secret from config', () => {
            JWTModule.forRoot({ secret: 'direct-secret' });

            expect(JWTModule.getSecret()).toBe('direct-secret');
        });

        it('should return secret from environment variable', () => {
            process.env.JWT_SECRET = 'env-secret';
            JWTModule.forRoot({ secretEnvVar: 'JWT_SECRET' });

            expect(JWTModule.getSecret()).toBe('env-secret');
        });

        it('should return null if no secret configured', () => {
            JWTModule.forRoot({ secretEnvVar: 'NONEXISTENT_VAR' });
            delete process.env.NONEXISTENT_VAR;

            expect(JWTModule.getSecret()).toBeNull();
        });

        it('should prefer direct secret over env var', () => {
            process.env.JWT_SECRET = 'env-secret';
            JWTModule.forRoot({ secret: 'direct-secret', secretEnvVar: 'JWT_SECRET' });

            expect(JWTModule.getSecret()).toBe('direct-secret');
        });
    });
});
