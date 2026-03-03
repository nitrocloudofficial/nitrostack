import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockUse = jest.fn();
const mockListen = jest.fn();
const mockSet = jest.fn();
const mockOptions = jest.fn();
const mockDelete = jest.fn();
const mockApp = {
    get: mockGet,
    post: mockPost,
    use: mockUse,
    listen: mockListen,
    set: mockSet,
    options: mockOptions,
    delete: mockDelete,
};
const mockExpress = jest.fn(() => mockApp);
(mockExpress as any).json = jest.fn();

jest.unstable_mockModule('express', () => ({
    default: mockExpress,
}));

// Mock http
const mockCreateServer = jest.fn();
jest.unstable_mockModule('http', () => ({
    default: {
        createServer: mockCreateServer,
    }
}));

// Mock uuid
jest.unstable_mockModule('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock fs
jest.unstable_mockModule('fs', () => ({
    readFileSync: jest.fn(() => Buffer.from('fake-logo')),
}));


const { StreamableHttpTransport } = await import('../streamable-http.js');
const { HttpServerTransport } = await import('../http-server.js');
const { DiscoveryHttpServer } = await import('../discovery-http-server.js');

describe('Transports', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('StreamableHttpTransport', () => {
        it('should instantiate with default options', () => {
            const transport = new StreamableHttpTransport();
            expect(transport).toBeDefined();
            expect(mockSet).toHaveBeenCalledWith('x-powered-by', false);
            expect(mockSet).toHaveBeenCalledWith('trust proxy', true);
        });

        it('should instantiate with custom options', () => {
            const transport = new StreamableHttpTransport({
                port: 4000,
                host: '127.0.0.1',
                endpoint: '/api/mcp',
                enableSessions: true,
                enableCors: true,
            });
            expect(transport).toBeDefined();
        });

        it('should setup routes for POST, GET, DELETE', () => {
            new StreamableHttpTransport({ endpoint: '/mcp' });

            // Check that POST routes are setup
            expect(mockPost).toHaveBeenCalledWith('/mcp', expect.any(Function));
            expect(mockPost).toHaveBeenCalledWith('/mcp/message', expect.any(Function));

            // Check that GET routes are setup
            expect(mockGet).toHaveBeenCalledWith('/mcp', expect.any(Function));
            expect(mockGet).toHaveBeenCalledWith('/mcp/sse', expect.any(Function));
            expect(mockGet).toHaveBeenCalledWith('/mcp/health', expect.any(Function));

            // Check that DELETE routes are setup
            expect(mockDelete).toHaveBeenCalledWith('/mcp', expect.any(Function));
        });

        it('should setup CORS OPTIONS handlers when enabled', () => {
            new StreamableHttpTransport({ enableCors: true, endpoint: '/mcp' });

            expect(mockOptions).toHaveBeenCalledWith('/mcp', expect.any(Function));
            expect(mockOptions).toHaveBeenCalledWith('/mcp/sse', expect.any(Function));
            expect(mockOptions).toHaveBeenCalledWith('/mcp/message', expect.any(Function));
        });

        it('should start HTTP server', async () => {
            const transport = new StreamableHttpTransport();
            const mockServer = {
                once: jest.fn((event: string, cb: any) => {
                    if (event === 'listening') cb();
                }),
                on: jest.fn(),
                removeListener: jest.fn(),
                close: jest.fn((cb: any) => cb()),
            };
            (mockListen as any).mockReturnValue(mockServer);

            await transport.start();
            expect(mockListen).toHaveBeenCalled();
        });

        it('should close server properly', async () => {
            const transport = new StreamableHttpTransport();
            const mockServer = {
                once: jest.fn((event: string, cb: any) => {
                    if (event === 'listening') cb();
                }),
                on: jest.fn(),
                removeListener: jest.fn(),
                close: jest.fn((cb: any) => cb()),
                listening: true,
            };
            (mockListen as any).mockReturnValue(mockServer);

            await transport.start();
            await transport.close();

            expect(mockServer.close).toHaveBeenCalled();
        });

        it('should register message handler', async () => {
            const transport = new StreamableHttpTransport();
            const handler = jest.fn();

            transport.onmessage = handler as any;
            // Handler is stored internally
            expect(transport).toBeDefined();
        });

        it('should register close handler', async () => {
            const transport = new StreamableHttpTransport();
            const handler = jest.fn();

            transport.onclose = handler as any;
            expect(transport).toBeDefined();
        });

        it('should register error handler', async () => {
            const transport = new StreamableHttpTransport();
            const handler = jest.fn();

            transport.onerror = handler as any;
            expect(transport).toBeDefined();
        });

        it('should register additional HTTP routes via on()', () => {
            const transport = new StreamableHttpTransport();
            const handler = jest.fn();

            transport.on('/custom-route', handler as any);
            expect(mockGet).toHaveBeenCalledWith('/custom-route', handler);
        });
    });

    describe('HttpServerTransport', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should setup routes on instantiation', () => {
            new HttpServerTransport({ port: 3000 });
            expect(mockUse).toHaveBeenCalled(); // CORS, JSON
            expect(mockGet).toHaveBeenCalledWith('/mcp/sse', expect.any(Function));
            expect(mockPost).toHaveBeenCalledWith('/mcp/message', expect.any(Function));
        });

        it('should setup OAuth routes if configured', () => {
            new HttpServerTransport({
                oauth: {
                    resourceUri: 'u',
                    authorizationServers: ['s']
                }
            });
            expect(mockGet).toHaveBeenCalledWith('/.well-known/oauth-protected-resource', expect.any(Function));
        });

        it('should start server', async () => {
            const transport = new HttpServerTransport();
            const mockServer = {
                once: jest.fn((event: string, cb: any) => {
                    if (event === 'listening') cb();
                }),
                on: jest.fn(),
                removeListener: jest.fn(),
            };
            (mockListen as any).mockReturnValue(mockServer);

            await transport.start();
            expect(mockListen).toHaveBeenCalled();
        });

        it('should close server properly', async () => {
            const transport = new HttpServerTransport();
            const mockServer = {
                once: jest.fn((event: string, cb: any) => {
                    if (event === 'listening') cb();
                }),
                on: jest.fn(),
                removeListener: jest.fn(),
                close: jest.fn((cb: any) => cb()),
                listening: true,
            };
            (mockListen as any).mockReturnValue(mockServer);

            await transport.start();
            await transport.close();

            expect(mockServer.close).toHaveBeenCalled();
        });

        it('should send messages to SSE clients', async () => {
            const transport = new HttpServerTransport();
            const mockServer = {
                once: jest.fn((event: string, cb: any) => {
                    if (event === 'listening') cb();
                }),
                on: jest.fn(),
                removeListener: jest.fn(),
            };
            (mockListen as any).mockReturnValue(mockServer);

            await transport.start();

            // send() won't throw even with no clients
            await expect(transport.send({
                jsonrpc: '2.0',
                method: 'test',
            })).resolves.toBeUndefined();
        });
    });

    describe('DiscoveryHttpServer', () => {
        it('should instantiate and start', async () => {
            const mockServer = {
                listen: jest.fn((port: number, cb: any) => cb()),
                on: jest.fn(),
                close: jest.fn((cb: any) => cb()),
                listening: true
            };
            (mockCreateServer as any).mockReturnValue(mockServer);

            const server = new DiscoveryHttpServer(3000, console);
            await server.start();

            expect(mockServer.listen).toHaveBeenCalledWith(3000, expect.any(Function));

            await server.stop();
            expect(mockServer.close).toHaveBeenCalled();
        });

        it('should handle start when already running', async () => {
            const mockServer = {
                listen: jest.fn((port: number, cb: any) => cb()),
                on: jest.fn(),
                close: jest.fn((cb: any) => cb()),
                listening: true
            };
            (mockCreateServer as any).mockReturnValue(mockServer);

            const server = new DiscoveryHttpServer(3000, console);
            await server.start();

            // Starting again should not throw
            await expect(server.start()).resolves.toBeUndefined();
        });

        it('should handle stop when not running', async () => {
            const mockServer = {
                listen: jest.fn((port: number, cb: any) => cb()),
                on: jest.fn(),
                close: jest.fn((cb: any) => cb()),
                listening: false
            };
            (mockCreateServer as any).mockReturnValue(mockServer);

            const server = new DiscoveryHttpServer(3000, console);

            // Stopping without starting should not throw
            await expect(server.stop()).resolves.toBeUndefined();
        });
    });
});
