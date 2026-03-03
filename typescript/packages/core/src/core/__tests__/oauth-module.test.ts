import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { OAuthModule, OAuthModuleConfig } from '../oauth-module.js';

describe('OAuthModule', () => {
    beforeEach(() => {
        // Reset static config between tests
        (OAuthModule as any).config = null;
    });

    describe('forRoot', () => {
        it('should throw if resourceUri is missing', () => {
            expect(() => {
                OAuthModule.forRoot({
                    resourceUri: '',
                    authorizationServers: ['https://auth.example.com']
                });
            }).toThrow('resourceUri is required');
        });

        it('should throw if authorizationServers is empty', () => {
            expect(() => {
                OAuthModule.forRoot({
                    resourceUri: 'https://api.example.com',
                    authorizationServers: []
                });
            }).toThrow('at least one authorizationServer is required');
        });

        it('should return module config with providers', () => {
            const result = OAuthModule.forRoot({
                resourceUri: 'https://api.example.com',
                authorizationServers: ['https://auth.example.com']
            });

            expect(result.module).toBe(OAuthModule);
            expect(result.providers).toHaveLength(1);
            expect(result.providers[0].provide).toBe('OAUTH_CONFIG');
        });

        it('should set audience to resourceUri if not provided', () => {
            OAuthModule.forRoot({
                resourceUri: 'https://api.example.com',
                authorizationServers: ['https://auth.example.com']
            });

            const config = OAuthModule.getConfig();
            expect(config?.audience).toBe('https://api.example.com');
        });

        it('should preserve custom audience if provided', () => {
            OAuthModule.forRoot({
                resourceUri: 'https://api.example.com',
                authorizationServers: ['https://auth.example.com'],
                audience: 'custom-audience'
            });

            const config = OAuthModule.getConfig();
            expect(config?.audience).toBe('custom-audience');
        });
    });

    describe('getConfig', () => {
        it('should return null when not configured', () => {
            expect(OAuthModule.getConfig()).toBeNull();
        });

        it('should return config after forRoot', () => {
            OAuthModule.forRoot({
                resourceUri: 'https://api.example.com',
                authorizationServers: ['https://auth.example.com']
            });

            const config = OAuthModule.getConfig();
            expect(config).toBeDefined();
            expect(config?.resourceUri).toBe('https://api.example.com');
        });
    });

    describe('validateToken', () => {
        beforeEach(() => {
            OAuthModule.forRoot({
                resourceUri: 'https://api.example.com',
                authorizationServers: ['https://auth.example.com'],
                audience: 'https://api.example.com',
                issuer: 'https://auth.example.com'
            });
        });

        it('should return error when module not configured', async () => {
            (OAuthModule as any).config = null;

            const result = await OAuthModule.validateToken('some-token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('OAuth module not configured');
        });

        it('should detect encrypted JWE tokens', async () => {
            // Create a mock JWE header (encrypted token)
            const jweHeader = Buffer.from(JSON.stringify({ alg: 'dir', enc: 'A256GCM' })).toString('base64');
            const mockJwe = `${jweHeader}.payload.iv.ciphertext.tag`;

            const result = await OAuthModule.validateToken(mockJwe);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('encrypted JWE token');
        });

        it('should reject invalid token format', async () => {
            const result = await OAuthModule.validateToken('invalid-token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid token format');
        });

        it('should validate a valid JWT token', async () => {
            // Create a mock JWT with proper payload
            const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
            const payload = Buffer.from(JSON.stringify({
                sub: 'user123',
                aud: 'https://api.example.com',
                iss: 'https://auth.example.com',
                exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
            })).toString('base64url');
            const signature = 'mock-signature';
            const mockJwt = `${header}.${payload}.${signature}`;

            const result = await OAuthModule.validateToken(mockJwt);

            expect(result.valid).toBe(true);
            expect(result.payload).toBeDefined();
        });

        it('should reject expired token', async () => {
            const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
            const payload = Buffer.from(JSON.stringify({
                sub: 'user123',
                aud: 'https://api.example.com',
                iss: 'https://auth.example.com',
                exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
            })).toString('base64url');
            const mockJwt = `${header}.${payload}.signature`;

            const result = await OAuthModule.validateToken(mockJwt);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Token expired');
        });

        it('should reject wrong issuer', async () => {
            const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
            const payload = Buffer.from(JSON.stringify({
                sub: 'user123',
                aud: 'https://api.example.com',
                iss: 'https://wrong-issuer.com',
                exp: Math.floor(Date.now() / 1000) + 3600
            })).toString('base64url');
            const mockJwt = `${header}.${payload}.signature`;

            const result = await OAuthModule.validateToken(mockJwt);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('issuer mismatch');
        });

        it('should reject wrong audience', async () => {
            const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
            const payload = Buffer.from(JSON.stringify({
                sub: 'user123',
                aud: 'https://wrong-audience.com',
                iss: 'https://auth.example.com',
                exp: Math.floor(Date.now() / 1000) + 3600
            })).toString('base64url');
            const mockJwt = `${header}.${payload}.signature`;

            const result = await OAuthModule.validateToken(mockJwt);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('audience mismatch');
        });

        it('should run custom validation if provided', async () => {
            (OAuthModule as any).config = {
                resourceUri: 'https://api.example.com',
                authorizationServers: ['https://auth.example.com'],
                audience: 'https://api.example.com',
                customValidation: () => false
            };

            const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
            const payload = Buffer.from(JSON.stringify({
                sub: 'user123',
                aud: 'https://api.example.com',
                exp: Math.floor(Date.now() / 1000) + 3600
            })).toString('base64url');
            const mockJwt = `${header}.${payload}.signature`;

            const result = await OAuthModule.validateToken(mockJwt);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Custom validation failed');
        });
    });
});
