import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import http from 'node:http';
import { StreamableHttpTransport } from '../transports/streamable-http.js';
import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import {
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Build a minimal configured MCP server for the host to spin up per session.
 */
function makeServerFactory() {
    return () => {
        const server = new McpServer(
            { name: 'test-server', version: '1.2.3' },
            { capabilities: { tools: { listChanged: true } } },
        );
        server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                { name: 'ping', description: 'ping tool', inputSchema: { type: 'object' } },
            ],
        }));
        return server;
    };
}

/**
 * Read a single JSON-RPC message from a POST response, whether the SDK replied
 * with a direct JSON body or a (self-terminating) SSE stream.
 */
async function readJsonRpc(res: Response): Promise<any> {
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    if (contentType.includes('application/json')) {
        return JSON.parse(text);
    }
    const dataLines = text
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice('data:'.length).trim());
    return JSON.parse(dataLines[dataLines.length - 1]);
}

const MCP_ACCEPT = 'application/json, text/event-stream';

describe('StreamableHttpTransport (SDK-delegated host)', () => {
    let transport: StreamableHttpTransport;
    const port = 3060;
    const baseUrl = `http://localhost:${port}/mcp`;

    beforeEach(async () => {
        transport = new StreamableHttpTransport({
            port,
            host: 'localhost',
            enableCors: true,
        });
        transport.setMcpServerFactory(makeServerFactory());
        await transport.start();
    });

    afterEach(async () => {
        await transport.close();
    });

    it('generates the documentation page and escapes HTML', () => {
        const st = transport as any;
        st.setServerConfig({ name: 'DocTest', version: '1.0.0', description: 'A test server' });

        const html = st.generateDocumentationPage(
            [{ name: 'tool1', description: 'd1', inputSchema: {}, widget: true } as any],
            'http://localhost:3060/mcp',
        );

        expect(html).toContain('DocTest');
        expect(html).toContain('1.0.0');
        expect(html).toContain('tool1');
        expect(st.escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('detects localhost variants and exposes the Express app', () => {
        const st = transport as any;
        expect(st.isLocalhost('127.0.0.1')).toBe(true);
        expect(st.isLocalhost('::1')).toBe(true);
        expect(st.isLocalhost('[::1]:3000')).toBe(true);
        expect(st.isLocalhost('localhost:3000')).toBe(true);
        expect(st.isLocalhost('google.com')).toBe(false);
        expect(transport.getApp()).toBeDefined();
    });

    it('completes an initialize + tools/list handshake, returning JSON-RPC on the POST', async () => {
        // 1. initialize
        const initRes = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: MCP_ACCEPT },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2025-06-18',
                    capabilities: {},
                    clientInfo: { name: 'test-client', version: '1.0.0' },
                },
            }),
        });
        expect(initRes.status).toBe(200);
        const sessionId = initRes.headers.get('mcp-session-id');
        expect(sessionId).toBeTruthy();

        const initMsg = await readJsonRpc(initRes);
        expect(initMsg.id).toBe(1);
        expect(initMsg.result.serverInfo.name).toBe('test-server');
        expect(initMsg.result.protocolVersion).toBeDefined();

        // 2. notifications/initialized
        const notifRes = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: MCP_ACCEPT,
                'mcp-session-id': sessionId!,
            },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
        });
        expect(notifRes.status).toBe(202);
        await notifRes.text();

        // 3. tools/list should return the registered tool on the POST response
        const listRes = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: MCP_ACCEPT,
                'mcp-session-id': sessionId!,
            },
            body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
        });
        expect(listRes.status).toBe(200);
        const listMsg = await readJsonRpc(listRes);
        expect(listMsg.id).toBe(2);
        expect(listMsg.result.tools).toHaveLength(1);
        expect(listMsg.result.tools[0].name).toBe('ping');

        // 4. terminate the session
        const delRes = await fetch(baseUrl, {
            method: 'DELETE',
            headers: { 'mcp-session-id': sessionId! },
        });
        expect([200, 204]).toContain(delRes.status);
    });

    it('bridges the HTTP Authorization header into the session context', async () => {
        const sessionContexts: any[] = [];
        const authTransport = new StreamableHttpTransport({ port: 3069, host: 'localhost', enableCors: true });
        authTransport.setMcpServerFactory(((sessionContext: any) => {
            sessionContexts.push(sessionContext);
            return makeServerFactory()();
        }) as any);
        await authTransport.start();

        try {
            // 1. initialize without an auth header
            const initRes = await fetch('http://localhost:3069/mcp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: MCP_ACCEPT },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'initialize',
                    params: {
                        protocolVersion: '2025-06-18',
                        capabilities: {},
                        clientInfo: { name: 'test-client', version: '1.0.0' },
                    },
                }),
            });
            expect(initRes.status).toBe(200);
            const sessionId = initRes.headers.get('mcp-session-id');
            expect(sessionId).toBeTruthy();
            await initRes.text();

            expect(sessionContexts).toHaveLength(1);
            expect(sessionContexts[0].authHeader).toBeUndefined();

            // 2. subsequent request carries the bearer token
            const listRes = await fetch('http://localhost:3069/mcp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: MCP_ACCEPT,
                    'mcp-session-id': sessionId!,
                    Authorization: 'Bearer test-token-123',
                },
                body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
            });
            expect(listRes.status).toBe(200);
            await listRes.text();

            expect(sessionContexts[0].authHeader).toBe('Bearer test-token-123');
        } finally {
            await authTransport.close();
        }
    });

    describe('clients that do not accept text/event-stream', () => {
        const initializeBody = JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2025-06-18',
                capabilities: {},
                clientInfo: { name: 'json-client', version: '1.0.0' },
            },
        });

        /** Raw request, because fetch() adds `Accept: *\/*` when none is given. */
        function post(
            headers: Record<string, string>,
            body: string,
            method: string = 'POST',
        ): Promise<{ status: number; headers: http.IncomingHttpHeaders; text: string }> {
            return new Promise((resolve, reject) => {
                const req = http.request(
                    baseUrl,
                    { method, headers: { ...headers, ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}) } },
                    (res) => {
                        let text = '';
                        res.setEncoding('utf8');
                        res.on('data', (chunk) => (text += chunk));
                        res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, text }));
                    },
                );
                req.on('error', reject);
                if (body) req.write(body);
                req.end();
            });
        }

        it.each([
            ['application/json', { Accept: 'application/json' }],
            ['*/*', { Accept: '*/*' }],
            ['no Accept header', {}],
        ])('answers initialize and tools/list with JSON for %s', async (_label, accept) => {
            const base = { 'Content-Type': 'application/json', ...accept };

            const init = await post(base, initializeBody);
            expect(init.status).toBe(200);
            expect(init.headers['content-type']).toContain('application/json');
            expect(JSON.parse(init.text)).toMatchObject({ id: 1, result: { serverInfo: { name: 'test-server' } } });
            const sessionId = init.headers['mcp-session-id'] as string;
            expect(sessionId).toBeTruthy();

            const list = await post(
                { ...base, 'mcp-session-id': sessionId },
                JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
            );
            expect(list.status).toBe(200);
            expect(list.headers['content-type']).toContain('application/json');
            expect(JSON.parse(list.text)).toMatchObject({ id: 2, result: { tools: [{ name: 'ping' }] } });
        });

        it('keeps SSE responses for clients that accept them', async () => {
            const init = await post({ 'Content-Type': 'application/json', Accept: MCP_ACCEPT }, initializeBody);
            expect(init.status).toBe(200);
            expect(init.headers['content-type']).toContain('text/event-stream');
        });

        it('leaves GET on a JSON session unchanged', async () => {
            const init = await post({ 'Content-Type': 'application/json', Accept: 'application/json' }, initializeBody);
            const sessionId = init.headers['mcp-session-id'] as string;
            const get = await post({ Accept: 'application/json', 'mcp-session-id': sessionId }, '', 'GET');
            expect(get.status).toBe(406);
        });
    });

    it('rejects a non-initialize POST without a session with 400', async () => {
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: MCP_ACCEPT },
            body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/list', params: {} }),
        });
        expect(res.status).toBe(400);
        const body: any = await res.json();
        expect(body.error).toBeDefined();
    });

    it('validates Origin when CORS is disabled', async () => {
        const secureTransport = new StreamableHttpTransport({ port: 3068, enableCors: false });
        secureTransport.setMcpServerFactory(makeServerFactory());
        await secureTransport.start();

        try {
            const res = await fetch('http://localhost:3068/mcp', {
                method: 'POST',
                headers: {
                    Origin: 'http://malicious.com',
                    Host: 'localhost:3068',
                    'Content-Type': 'application/json',
                    Accept: MCP_ACCEPT,
                },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'ping' }),
            });
            expect(res.status).toBe(403);
        } finally {
            await secureTransport.close();
        }
    });
});
