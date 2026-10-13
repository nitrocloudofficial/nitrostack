import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import {
    createSimpleJWTAuth,
    generateJWT,
    verifyJWT,
    decodeJWT
} from '../simple-jwt.js';
import { SecretValue } from '../secure-secret.js';

describe('Simple JWT Auth', () => {
    const secret = 'test-secret';
    const baseConfig = { secret };

    describe('Utilities', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
        });

        it('should generate and verify JWT', () => {
            const token = generateJWT({
                secret,
                payload: { sub: 'user1', scopes: ['read'] },
                expiresIn: '1h',
                audience: 'aud',
                issuer: 'iss'
            });

            expect(token).toBeDefined();
            const payload = verifyJWT(token, { secret, audience: 'aud', issuer: 'iss' });
            expect(payload?.sub).toBe('user1');
            expect(payload?.aud).toBe('aud');
            expect(payload?.iss).toBe('iss');
        });

        it('should return null for invalid JWT in verifyJWT', () => {
            expect(verifyJWT('invalid', baseConfig)).toBeNull();
        });

        it('should handle custom validation in verifyJWT', () => {
            const token = generateJWT({ secret, payload: { sub: 'u' } });
            const validResult = verifyJWT(token, { secret, customValidation: (p) => p.sub === 'u' });
            expect(validResult).not.toBeNull();

            const invalidResult = verifyJWT(token, { secret, customValidation: (p) => p.sub === 'wrong' });
            expect(invalidResult).toBeNull();
        });

        it('should decode JWT', () => {
            const token = generateJWT({ secret, payload: { sub: 'u' } });
            const decoded = decodeJWT(token);
            expect(decoded?.sub).toBe('u');
        });

        it('should handle decode error', () => {
            jest.spyOn(jwt, 'decode').mockImplementation(() => { throw new Error('Fail'); });
            expect(decodeJWT('anything')).toBeNull();
        });
    });

    describe('Middleware', () => {
        let req: any;
        let res: any;
        let next: any;

        beforeEach(() => {
            jest.restoreAllMocks();
            req = { headers: {} };
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            next = jest.fn();
        });

        it('should authenticate valid token', async () => {
            const token = generateJWT({ secret, payload: { sub: 'u', scope: 's1 s2' } });
            req.headers.authorization = `Bearer ${token}`;
            const middleware = createSimpleJWTAuth(baseConfig);

            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.auth.authenticated).toBe(true);
            expect(req.auth.scopes).toEqual(['s1', 's2']);
        });

        it('should handle audience and issuer validation', async () => {
            const token = generateJWT({ secret, payload: { sub: 'u' }, audience: 'aud', issuer: 'iss' });
            req.headers.authorization = `Bearer ${token}`;
            const middleware = createSimpleJWTAuth({ secret, audience: 'aud', issuer: 'iss' });
            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.auth.tokenInfo.aud).toEqual(['aud']);
        });

        it('should 401 if no header', async () => {
            const middleware = createSimpleJWTAuth(baseConfig);
            await middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should 401 if expired', async () => {
            const token = jwt.sign({ sub: 'u', exp: Math.floor(Date.now() / 1000) - 10 }, secret);
            req.headers.authorization = `Bearer ${token}`;
            const middleware = createSimpleJWTAuth({ secret });

            await middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'token_expired' }));
        });

        it('should 401 if invalid token string', async () => {
            req.headers.authorization = 'Bearer invalid-token';
            const middleware = createSimpleJWTAuth(baseConfig);
            await middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid_token' }));
        });

        it('should 403 if custom validation fails', async () => {
            const token = generateJWT({ secret, payload: { sub: 'u' } });
            req.headers.authorization = `Bearer ${token}`;
            const middleware = createSimpleJWTAuth({ secret, customValidation: () => false });

            await middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should handle runtime errors in middleware', async () => {
            req.headers.authorization = 'Bearer valid-looking-token';
            jest.spyOn(jwt, 'verify').mockImplementationOnce(() => { throw new Error('Unexpected'); });
            const middleware = createSimpleJWTAuth(baseConfig);

            await middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should handle SecretValue from env', async () => {
            const prev = process.env.JWT_SECRET;
            process.env.JWT_SECRET = secret;
            const token = generateJWT({ secret: SecretValue.fromEnv('JWT_SECRET'), payload: { sub: 'u' } });
            expect(token).toBeDefined();
            process.env.JWT_SECRET = prev;
        });

        it('should handle malformed header', async () => {
            req.headers.authorization = 'NotBearer token';
            const middleware = createSimpleJWTAuth(baseConfig);
            await middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });
});
