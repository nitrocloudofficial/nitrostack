import { describe, it, expect } from '@jest/globals';
import {
    createProtectedResourceMetadata,
    getWellKnownMetadataUris,
    generateWWWAuthenticateHeader,
    parseWWWAuthenticateHeader
} from '../server-metadata.js';

describe('Server Metadata', () => {
    describe('createProtectedResourceMetadata', () => {
        it('should create metadata with minimal info', () => {
            const meta = createProtectedResourceMetadata('https://api', ['https://auth']);
            expect(meta.resource).toBe('https://api');
            expect(meta.authorization_servers).toEqual(['https://auth']);
            expect(meta.bearer_methods_supported).toEqual(['header']);
        });

        it('should include supported scopes', () => {
            const meta = createProtectedResourceMetadata('https://api', ['https://auth'], ['read', 'write']);
            expect(meta.scopes_supported).toEqual(['read', 'write']);
        });
    });

    describe('getWellKnownMetadataUris', () => {
        it('should return multiple URIs if resource has path', () => {
            const url = new URL('https://api.com/mcp');
            const uris = getWellKnownMetadataUris(url);
            expect(uris).toHaveLength(2);
            expect(uris).toContain('https://api.com/.well-known/oauth-protected-resource/mcp');
            expect(uris).toContain('https://api.com/.well-known/oauth-protected-resource');
        });

        it('should return single URI if resource is root', () => {
            const url = new URL('https://api.com/');
            const uris = getWellKnownMetadataUris(url);
            expect(uris).toHaveLength(1);
            expect(uris).toContain('https://api.com/.well-known/oauth-protected-resource');
        });
    });

    describe('generateWWWAuthenticateHeader', () => {
        it('should generate basic header', () => {
            expect(generateWWWAuthenticateHeader({})).toBe('Bearer');
        });

        it('should include all parameters', () => {
            const header = generateWWWAuthenticateHeader({
                realm: 'mcp',
                scope: 'read write',
                resourceMetadataUrl: 'https://meta',
                error: 'invalid_token',
                errorDescription: 'Expired'
            });
            expect(header).toContain('realm="mcp"');
            expect(header).toContain('scope="read write"');
            expect(header).toContain('resource_metadata="https://meta"');
            expect(header).toContain('error="invalid_token"');
            expect(header).toContain('error_description="Expired"');
        });
    });

    describe('parseWWWAuthenticateHeader', () => {
        it('should parse valid header', () => {
            const header = 'Bearer realm="mcp", scope="read", resource_metadata="https://api", error="invalid", error_description="desc"';
            const parsed = parseWWWAuthenticateHeader(header);
            expect(parsed?.scheme).toBe('Bearer');
            expect(parsed?.realm).toBe('mcp');
            expect(parsed?.scope).toBe('read');
            expect(parsed?.resourceMetadata).toBe('https://api');
            expect(parsed?.error).toBe('invalid');
            expect(parsed?.errorDescription).toBe('desc');
        });

        it('should return null for invalid headers', () => {
            expect(parseWWWAuthenticateHeader('')).toBeNull();
            expect(parseWWWAuthenticateHeader('Basic realm="mcp"')).toBeNull();
        });

        it('should handle partial parameters', () => {
            const parsed = parseWWWAuthenticateHeader('Bearer realm="test"');
            expect(parsed?.realm).toBe('test');
            expect(parsed?.scope).toBeUndefined();
        });
    });
});
