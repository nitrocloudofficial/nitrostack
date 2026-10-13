import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
    createAPIKeyAuth,
    generateAPIKey,
    hashAPIKey,
    isValidAPIKeyFormat,
    validateAPIKeyWithMetadata,
    generateAPIKeyWithMetadata
} from '../api-key.js';

describe('API Key Auth', () => {
    describe('Utilities', () => {
        it('should generate valid keys', () => {
            const key = generateAPIKey();
            expect(key.startsWith('sk_')).toBe(true);
            expect(isValidAPIKeyFormat(key)).toBe(true);
        });

        it('should hash keys consistently', () => {
            const key = 'test-key';
            const hash1 = hashAPIKey(key);
            const hash2 = hashAPIKey(key);
            expect(hash1).toBe(hash2);
            expect(hash1).not.toBe(key);
        });

        it('should validate format', () => {
            expect(isValidAPIKeyFormat('sk_12345678901234567890123456789012', 'sk')).toBe(true);
            expect(isValidAPIKeyFormat('invalid')).toBe(false);
            expect(isValidAPIKeyFormat('k'.repeat(32))).toBe(true);
        });

        it('should validate metadata', () => {
            const metadata = {
                hashed: 'hash',
                name: 'test',
                createdAt: new Date(),
                scopes: ['read']
            };

            const result = validateAPIKeyWithMetadata('key', metadata, ['read']);
            expect(result.valid).toBe(true);

            const failResult = validateAPIKeyWithMetadata('key', metadata, ['write']);
            expect(failResult.valid).toBe(false);

            const starredResult = validateAPIKeyWithMetadata('key', { ...metadata, scopes: ['*'] }, ['any']);
            expect(starredResult.valid).toBe(true);
        });
    });

    describe('Middleware', () => {
        let req: any;
        let res: any;
        let next: any;

        beforeEach(() => {
            req = { headers: {}, query: {} };
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            next = jest.fn();
        });

        it('should authenticate with valid key in header', async () => {
            const middleware = createAPIKeyAuth({ keys: ['valid-key'] });
            req.headers['x-api-key'] = 'valid-key';

            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.auth.authenticated).toBe(true);
        });

        it('should reject missing key', async () => {
            const middleware = createAPIKeyAuth({ keys: ['valid-key'], allowQueryParam: true });
            await middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('query parameter') }));

            const middlewareNoQuery = createAPIKeyAuth({ keys: ['k'] });
            await middlewareNoQuery(req, res, next);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.not.stringContaining('query parameter') }));
        });

        it('should reject invalid key', async () => {
            const middleware = createAPIKeyAuth({ keys: ['valid-key'] });
            req.headers['x-api-key'] = 'invalid-key';
            await middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should handle runtime errors', async () => {
            const middleware = createAPIKeyAuth({
                keys: ['k'],
                customValidation: () => { throw new Error('Runtime'); }
            });
            req.headers['x-api-key'] = 'k';
            await middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should support hashed keys', async () => {
            const key = 'my-secret-key';
            const hashed = hashAPIKey(key);
            const middleware = createAPIKeyAuth({ keys: [hashed], hashed: true });

            req.headers['x-api-key'] = key;
            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('Extended Features', () => {
        let req: any;
        let res: any;
        let next: any;

        beforeEach(() => {
            req = { headers: {}, query: {} };
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            next = jest.fn();
        });

        it('should accept query parameters if configured', async () => {
            const middleware = createAPIKeyAuth({
                keys: ['k'],
                allowQueryParam: true
            });
            req.query['api_key'] = 'k';
            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should use custom query param name', async () => {
            const middleware = createAPIKeyAuth({
                keys: ['k'],
                allowQueryParam: true,
                queryParamName: 'token'
            });
            req.query['token'] = 'k';
            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should use custom validation', async () => {
            const middleware = createAPIKeyAuth({
                keys: ['k'],
                customValidation: async (key: string) => key === 'k'
            });
            req.headers['x-api-key'] = 'k';
            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();

            (middleware as any)(req, res.status(0), next); // Reset mock? No, just call again.
            req.headers['x-api-key'] = 'wrong';
            await middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should throw error if config invalid', () => {
            expect(() => createAPIKeyAuth({ keys: [] })).toThrow();
        });

        it('should generate metadata', () => {
            const meta = generateAPIKeyWithMetadata({
                name: 'test',
                prefix: 'test',
                expiresIn: 30,
                scopes: ['read']
            });
            expect(meta.key).toMatch(/^test_/);
            expect(meta.expiresAt).toBeDefined();
            expect(meta.scopes).toContain('read');
        });

        it('should validate expiration', () => {
            const entry = {
                name: 't', hashed: 'h', createdAt: new Date(),
                expiresAt: new Date(Date.now() - 1000) // expired
            };
            expect(validateAPIKeyWithMetadata('k', entry).valid).toBe(false);
        });
    });
});
