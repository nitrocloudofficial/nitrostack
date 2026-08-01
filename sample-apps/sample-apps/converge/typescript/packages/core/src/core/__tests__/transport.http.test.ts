import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { HttpServerTransport } from '../transports/http-server.js';
import { DiscoveryHttpServer } from '../transports/discovery-http-server.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

describe('HttpServerTransport', () => {
    let transport: HttpServerTransport;
    const port = 3005; // Different port
    const baseUrl = `http://localhost:${port}/mcp`;

    beforeEach(async () => {
        transport = new HttpServerTransport({ port, host: 'localhost' });
        await transport.start();
    });

    afterEach(async () => {
        await transport.close();
    });

    it('should have a working health endpoint', async () => {
        const res = await fetch(`${baseUrl}/health`);
        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.status).toBe('ok');
    });

    it('should have a working info endpoint', async () => {
        const res = await fetch(baseUrl);
        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.transport).toBe('HTTP');
    });

    it('should handle SSE connection', async () => {
        const res = await fetch(`${baseUrl}/sse?clientId=test-client`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/event-stream');
        await res.body?.getReader().cancel();
    });

    it('should handle incoming messages', async () => {
        const onMessage = jest.fn(async () => { });
        transport.onmessage = onMessage;

        const message: JSONRPCMessage = {
            jsonrpc: '2.0',
            id: 1,
            method: 'ping'
        };

        const res = await fetch(`${baseUrl}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(message)
        });

        // If it still fails with 404, maybe let's log the app routes
        if (res.status === 404) {
            console.log('Registered routes:', (transport as any).app._router.stack.map((l: any) => l.route?.path).filter(Boolean));
        }

        expect(res.status).toBe(200);
        expect(onMessage).toHaveBeenCalled();
    });

    it('should handle message errors (invalid message)', async () => {
        const res = await fetch(`${baseUrl}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ not: 'a-message' })
        });
        // HttpServerTransport line 174 checks for message.jsonrpc
        expect(res.status).toBe(400);
    });

    it('should allow custom discovery routes', async () => {
        const handler = jest.fn((req: any, res: any) => res.json({ custom: 'ok' }));
        transport.on('/custom-path', handler as any);

        const res = await fetch(`http://localhost:${port}/custom-path`);
        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.custom).toBe('ok');
    });

    it('should handle OAuth metadata', async () => {
        const oauthTransport = new HttpServerTransport({
            port: 3006,
            oauth: {
                resourceUri: 'test-res',
                authorizationServers: ['http://auth.com'],
                scopesSupported: ['read']
            }
        });
        await oauthTransport.start();

        const res = await fetch(`http://localhost:3006/.well-known/oauth-protected-resource`);
        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.resource).toBe('test-res');
        expect(data.scopes_supported).toContain('read');

        await oauthTransport.close();
    });
});

describe('DiscoveryHttpServer', () => {
    let discovery: DiscoveryHttpServer;
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const port = 3007;

    beforeEach(async () => {
        // Support both old (number) and new (options) API
        discovery = new DiscoveryHttpServer(port, logger as any);
        await discovery.start();
    });

    afterEach(async () => {
        await discovery.stop();
    });

    it('should register and call handlers', async () => {
        const handler = jest.fn((req: any, res: any) => {
            res.writeHead(200);
            res.end('ok');
        });
        discovery.on('/discovery', handler as any);

        const res = await fetch(`http://localhost:${port}/discovery`);
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('ok');
        expect(handler).toHaveBeenCalled();
    });

    it('should return 404 for unknown paths', async () => {
        const res = await fetch(`http://localhost:${port}/unknown`);
        expect(res.status).toBe(404);
        expect(logger.warn).toHaveBeenCalled();
    });

    it('should return the actual port via getPort()', () => {
        expect(discovery.getPort()).toBe(port);
    });
});

describe('DiscoveryHttpServer with options', () => {
    let discovery: DiscoveryHttpServer;
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    afterEach(async () => {
        if (discovery) {
            await discovery.stop();
        }
    });

    it('should support options-based constructor', async () => {
        discovery = new DiscoveryHttpServer({ port: 3008, autoRetry: false }, logger as any);
        await discovery.start();
        expect(discovery.getPort()).toBe(3008);
    });

    it('should auto-retry to find available port when enabled', async () => {
        // Start first server on specific port
        const first = new DiscoveryHttpServer({ port: 3009, autoRetry: false }, logger as any);
        await first.start();
        
        // Start second server with auto-retry, should find next available port
        discovery = new DiscoveryHttpServer({ port: 3009, autoRetry: true, maxRetries: 5 }, logger as any);
        await discovery.start();
        
        // Should have found a different port
        expect(discovery.getPort()).toBeGreaterThan(3009);
        expect(discovery.getPort()).toBeLessThanOrEqual(3014); // 3009 + 5 retries
        
        await first.stop();
    });
});
