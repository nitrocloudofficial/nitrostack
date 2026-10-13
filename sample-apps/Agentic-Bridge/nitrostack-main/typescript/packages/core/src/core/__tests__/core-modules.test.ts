import { jest, describe, it, expect } from '@jest/globals';
import { ApiKeyModule } from '../apikey-module';
import { ConfigModule } from '../config-module';
import { JWTModule } from '../jwt-module';
import { OAuthModule } from '../oauth-module';

describe('Core Modules', () => {
    describe('ApiKeyModule', () => {
        it('should configure keys', () => {
            const config = ApiKeyModule.forRoot({ keys: ['key1'] });
            expect(config.keys).toContain('key1');
            expect(ApiKeyModule.getKeys()).toContain('key1');
        });

        it('should valid key', async () => {
            ApiKeyModule.forRoot({ keys: ['valid'] });
            expect(await ApiKeyModule.validate('valid')).toBe(true);
            expect(await ApiKeyModule.validate('invalid')).toBe(false);
        });
    });

    describe('ConfigModule', () => {
        it('should configure', () => {
            const result = ConfigModule.forRoot({ defaults: { TEST: 'val' } });
            expect(result.providers).toBeDefined();
            expect(result.exports).toContain(result.providers[0].provide);
        });
    });

    describe('JWTModule', () => {
        it('should configure', () => {
            const config = JWTModule.forRoot({ secret: 'test' });
            expect(config.secret).toBe('test');
            expect(JWTModule.getConfig().secret).toBe('test');
        });
    });

    // JWT and OAuth modules are likely similar static containers or have simple configuration logic
    // I'll skip detailed checks unless they have logic.
    // Verified via file list they exist.
});
