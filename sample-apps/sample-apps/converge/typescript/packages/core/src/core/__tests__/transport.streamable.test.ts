import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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
