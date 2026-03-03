import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { StreamableHttpTransport } from '../transports/streamable-http.js';
import http from 'http';

describe('StreamableHttpTransport', () => {
    let transport: StreamableHttpTransport;
    const port = 3060;
    const baseUrl = `http://localhost:${port}/mcp`;

    beforeEach(async () => {
        jest.useFakeTimers();
        transport = new StreamableHttpTransport({
            port,
            host: 'localhost',
            enableSessions: true,
            enableCors: true
        });
        await transport.start();
    });

    afterEach(async () => {
        await transport.close();
        jest.useRealTimers();
    });

    it('should cover documentation page generation directly for coverage', async () => {
        const st = (transport as any);

        // Exercise the logo loading paths by calling it manually
        st.loadLogo();

        st.setServerConfig({
            name: 'DocTest',
            version: '1.0.0',
            description: 'A test server'
        });

        st.setToolsCallback(async () => [
            { name: 'tool1', description: 'd1', inputSchema: {}, widget: true } as any
        ]);

        // Manually trigger the doc generation to ensure 500 lines are covered
        const html = st.generateDocumentationPage(
            [{ name: 'tool1', description: 'd1', inputSchema: {}, widget: true } as any],
            'http://localhost:3060/mcp'
        );

        expect(html).toContain('DocTest');
        expect(html).toContain('1.0.0');
        expect(html).toContain('tool1');
        expect(html).toContain('Has UI Widget');

        // Exercise escapeHtml
        expect(st.escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('should handle session-based messaging and sessionless send', async () => {
        const st = (transport as any);
        const session = {
            id: 's1',
            streams: new Map([['str1', { response: { write: jest.fn(), end: jest.fn() }, closed: false, eventIdCounter: 0 }]]),
            messageQueue: [],
            lastActivity: Date.now()
        };
        st.sessions.set('s1', session);

        // Send request to session-based stream
        await transport.send({ jsonrpc: '2.0', method: 'req', id: 1 });
        expect(session.streams.get('str1')!.response.write).toHaveBeenCalled();

        // Send response to session-based stream
        await transport.send({ jsonrpc: '2.0', result: { ok: true }, id: 1 });

        // Send to sessionless stream
        const stream2 = { response: { write: jest.fn(), end: jest.fn() }, closed: false, eventIdCounter: 0 };
        st.activeStreams.set('str2', stream2);
        await transport.send({ jsonrpc: '2.0', method: 'req2', id: 2 });
        expect(stream2.response.write).toHaveBeenCalled();

        // Test replayMessages
        st.replayMessages(session, session.streams.get('str1'), 's1-0');
    });

    it('should cover initialization, middleware and route handlers', async () => {
        jest.useRealTimers();

        // POST /mcp (Initialize)
        const res1 = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } }
            })
        });
        expect(res1.status).toBe(202);
        const sessionId = res1.headers.get('Mcp-Session-Id');
        expect(sessionId).toBeDefined();

        // GET /mcp (SSE)
        const res2 = await fetch(baseUrl, { headers: { 'Mcp-Session-Id': sessionId!, 'Accept': 'text/event-stream' } });
        expect(res2.status).toBe(200);
        await res2.body?.getReader().cancel();

        // DELETE /mcp
        const res3 = await fetch(baseUrl, { method: 'DELETE', headers: { 'Mcp-Session-Id': sessionId! } });
        expect(res3.status).toBe(200);
    });

    it('should handle error paths in POST/GET/DELETE', async () => {
        jest.useRealTimers();

        // POST invalid json-rpc
        const res1 = await fetch(baseUrl, { method: 'POST', body: JSON.stringify({ id: 1 }) });
        expect(res1.status).toBe(400);

        // POST session not found
        const res2 = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Mcp-Session-Id': 'none', 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'ping' })
        });
        expect(res2.status).toBe(404);

        // GET rejects SSE
        const res3 = await fetch(baseUrl, { headers: { 'Accept': 'image/png' } });
        expect(res3.status).toBe(405);

        // DELETE missing session
        const res4 = await fetch(baseUrl, { method: 'DELETE' });
        expect(res4.status).toBe(400);
    });

    it('should handle session timeout cleanup', () => {
        const st = (transport as any);
        st.options.sessionTimeout = 1;
        const session = {
            id: 's-exp',
            streams: new Map([['str1', { response: { end: jest.fn() }, closed: false }]]),
            lastActivity: Date.now() - 100000,
            messageQueue: []
        };
        st.sessions.set('s-exp', session);

        jest.advanceTimersByTime(70000); // Trigger cleanup interval
        expect(st.sessions.has('s-exp')).toBe(false);
    });

    it('should test environment-specific logic (isLocalhost, options, getApp)', () => {
        const st = (transport as any);
        expect(st.isLocalhost('127.0.0.1')).toBe(true);
        expect(st.isLocalhost('::1')).toBe(true);
        expect(st.isLocalhost('[::1]:3000')).toBe(true);
        expect(st.isLocalhost('localhost:3000')).toBe(true);
        expect(st.isLocalhost('google.com')).toBe(false);

        expect(transport.getApp()).toBeDefined();

        // Test constructor default values
        const st2 = new StreamableHttpTransport({ enableCors: false, enableSessions: false });
        expect((st2 as any).options.enableSessions).toBe(false);
        expect((st2 as any).options.enableCors).toBe(false);
    });

    it('should validate origin when CORS is disabled', async () => {
        const secureTransport = new StreamableHttpTransport({ port: 3068, enableCors: false });
        await secureTransport.start();

        const res = await fetch('http://localhost:3068/mcp', {
            method: 'POST',
            headers: {
                'Origin': 'http://malicious.com',
                'Host': 'localhost:3068',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'ping' })
        });
        expect(res.status).toBe(403);

        // Valid origin
        const res2 = await fetch('http://localhost:3068/mcp', {
            method: 'POST',
            headers: {
                'Origin': 'http://localhost:3068',
                'Host': 'localhost:3068',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 })
        });
        expect(res2.status).toBe(202);

        await secureTransport.close();
    });

    it('should handle handleDelete failures and sessionless streaming', async () => {
        // DELETE session not found
        const res1 = await fetch(baseUrl, { method: 'DELETE', headers: { 'Mcp-Session-Id': 'missing' } });
        expect(res1.status).toBe(404);

        // GET sessionless
        const res2 = await fetch(baseUrl, { headers: { 'Accept': 'text/event-stream' } });
        expect(res2.status).toBe(400);
    });
});
