import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Resource, createResource } from '../resource.js';
import { ExecutionContext, ResourceContent } from '../types.js';

describe('Resource', () => {
    const mockContext: ExecutionContext = {
        requestId: 'test-request',
        logger: {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        },
        metadata: {},
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Resource class', () => {
        it('should create a resource with uri, name, and description', () => {
            const resource = new Resource({
                uri: 'file://test.txt',
                name: 'Test File',
                description: 'A test file resource',
                handler: async () => ({ type: 'text', data: 'content' })
            });

            expect(resource.uri).toBe('file://test.txt');
            expect(resource.name).toBe('Test File');
            expect(resource.description).toBe('A test file resource');
        });

        it('should return mimeType if defined', () => {
            const resource = new Resource({
                uri: 'file://test.json',
                name: 'JSON File',
                description: 'A JSON resource',
                mimeType: 'application/json',
                handler: async () => ({ type: 'json', data: {} })
            });

            expect(resource.mimeType).toBe('application/json');
        });

        it('should return undefined mimeType if not defined', () => {
            const resource = new Resource({
                uri: 'file://test.txt',
                name: 'Text File',
                description: 'A text resource',
                handler: async () => ({ type: 'text', data: 'content' })
            });

            expect(resource.mimeType).toBeUndefined();
        });

        it('should fetch resource content', async () => {
            const content: ResourceContent = { type: 'text', data: 'Hello, World!' };
            let called = false;

            const resource = new Resource({
                uri: 'file://test.txt',
                name: 'Test',
                description: 'Test resource',
                handler: async (uri) => {
                    called = true;
                    expect(uri).toBe('file://test.txt');
                    return content;
                }
            });

            const result = await resource.fetch(mockContext);

            expect(result).toEqual(content);
            expect(called).toBe(true);
            expect(mockContext.logger.info).toHaveBeenCalledWith(
                'Fetching resource: file://test.txt'
            );
        });

        it('should cache resource if cacheable', async () => {
            const content: ResourceContent = { type: 'text', data: 'Cached content' };
            let callCount = 0;

            const resource = new Resource({
                uri: 'file://cached.txt',
                name: 'Cached',
                description: 'Cacheable resource',
                metadata: { cacheable: true, cacheMaxAge: 60000 },
                handler: async () => {
                    callCount++;
                    return content;
                }
            });

            // First fetch
            await resource.fetch(mockContext);
            expect(callCount).toBe(1);

            // Second fetch should use cache
            await resource.fetch(mockContext);
            expect(callCount).toBe(1); // Still 1
            expect(mockContext.logger.debug).toHaveBeenCalledWith(
                'Serving cached resource: file://cached.txt'
            );
        });

        it('should clear cache', async () => {
            const content: ResourceContent = { type: 'text', data: 'content' };
            let callCount = 0;

            const resource = new Resource({
                uri: 'file://cached.txt',
                name: 'Cached',
                description: 'Cacheable resource',
                metadata: { cacheable: true },
                handler: async () => {
                    callCount++;
                    return content;
                }
            });

            // Fetch and cache
            await resource.fetch(mockContext);
            expect(callCount).toBe(1);

            // Clear cache
            resource.clearCache();

            // Should fetch again
            await resource.fetch(mockContext);
            expect(callCount).toBe(2);
        });

        it('should log error and throw when handler fails', async () => {
            const resource = new Resource({
                uri: 'file://failing.txt',
                name: 'Failing',
                description: 'Failing resource',
                handler: async () => {
                    throw new Error('Fetch failed');
                }
            });

            await expect(resource.fetch(mockContext)).rejects.toThrow('Fetch failed');
            expect(mockContext.logger.error).toHaveBeenCalledWith(
                'Error fetching resource: file://failing.txt',
                expect.any(Object)
            );
        });

        it('should convert to MCP resource format', () => {
            const resource = new Resource({
                uri: 'file://example.txt',
                name: 'Example',
                description: 'Example resource',
                mimeType: 'text/plain',
                handler: async () => ({ type: 'text', data: '' })
            });

            const mcpResource = resource.toMcpResource();

            expect(mcpResource).toEqual({
                uri: 'file://example.txt',
                name: 'Example',
                description: 'Example resource',
                mimeType: 'text/plain'
            });
        });

        it('should handle binary resource content', async () => {
            const content: ResourceContent = { type: 'binary', data: Buffer.from('binary data') };

            const resource = new Resource({
                uri: 'file://binary.bin',
                name: 'Binary',
                description: 'Binary resource',
                handler: async () => content
            });

            const result = await resource.fetch(mockContext);
            expect(result.type).toBe('binary');
        });

        it('should handle json resource content', async () => {
            const content: ResourceContent = { type: 'json', data: { key: 'value' } };

            const resource = new Resource({
                uri: 'file://data.json',
                name: 'JSON',
                description: 'JSON resource',
                handler: async () => content
            });

            const result = await resource.fetch(mockContext);
            expect(result.type).toBe('json');
        });
    });

    describe('createResource helper', () => {
        it('should create a Resource instance', () => {
            const resource = createResource({
                uri: 'file://helper-test.txt',
                name: 'Helper Test',
                description: 'Created via helper',
                handler: async () => ({ type: 'text', data: '' })
            });

            expect(resource).toBeInstanceOf(Resource);
            expect(resource.uri).toBe('file://helper-test.txt');
        });
    });
});
