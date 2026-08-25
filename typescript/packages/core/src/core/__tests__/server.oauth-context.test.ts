import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { NitroStackServer as NitroStackServerType } from '../server';

// Mock dependencies
jest.unstable_mockModule('@modelcontextprotocol/sdk/server/index.js', () => ({
    Server: jest.fn().mockImplementation(() => ({
        connect: jest.fn(),
        close: jest.fn(),
        addTool: jest.fn(),
        addResource: jest.fn(),
        addPrompt: jest.fn(),
        setRequestHandler: jest.fn(),
        onerror: jest.fn()
    }))
}));
jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
    SSEServerTransport: jest.fn(),
    StdioServerTransport: jest.fn()
}));
jest.unstable_mockModule('@modelcontextprotocol/sdk/server/sse.js', () => ({
    SSEServerTransport: jest.fn().mockImplementation(() => ({
        sessionId: 'sse-session-1',
        handlePostMessage: jest.fn(),
        close: jest.fn(),
    }))
}));
jest.unstable_mockModule('../logger', () => ({
    createLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    })
}));
jest.unstable_mockModule('../transports/streamable-http.js', () => ({
    StreamableHttpTransport: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        close: jest.fn(),
        setToolsCallback: jest.fn(),
        setServerConfig: jest.fn(),
        setMcpServerFactory: jest.fn(),
    }))
}));
jest.unstable_mockModule('../di/container.js', () => ({
    DIContainer: {
        getInstance: jest.fn().mockReturnValue({
            resolve: jest.fn(),
            register: jest.fn(),
            registerValue: jest.fn(),
            getInstances: jest.fn().mockReturnValue([]),
            instantiateAll: jest.fn()
        })
    }
}));
jest.unstable_mockModule('../builders.js', () => ({
    buildController: jest.fn().mockReturnValue({
        tools: [],
        resources: [],
        prompts: []
    })
}));
jest.unstable_mockModule('../module.js', () => ({
    Module: jest.fn((meta: any) => (target: any) => {
        Reflect.defineMetadata('nitro:module', meta, target);
        return target;
    }),
    isModule: jest.fn().mockReturnValue(true),
    getModuleMetadata: jest.fn().mockImplementation((m: any) => Reflect.getMetadata('nitro:module', m))
}));

const { Server: McpServer } = await import('@modelcontextprotocol/sdk/server/index.js');
const { NitroStackServer } = await import('../server');
const { CallToolRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');

function makeTool(name: string) {
    return {
        name,
        execute: jest.fn().mockImplementation(async () => 'ok'),
        toMcpTool: () => ({ name } as any),
        hasComponent: () => false,
        getComponent: () => undefined
    };
}

function getCallToolHandler(mcpInstance: any) {
    const calls = mcpInstance.setRequestHandler.mock.calls;
    return calls.find((c: any) => c[0] === CallToolRequestSchema)?.[1];
}

describe('ExecutionContext metadata (OAuth bridging)', () => {
    let server: NitroStackServerType;

    beforeEach(() => {
        jest.clearAllMocks();
        server = new NitroStackServer({ name: 'test-server', version: '1.0.0' });
    });

    it('merges request.params._meta (MCP spec) into context metadata', async () => {
        const mcpInstance = (McpServer as any).mock.results[0].value;
        const callTool = getCallToolHandler(mcpInstance);
        const tool = makeTool('meta-tool');
        server.tool(tool as any);

        await callTool({
            params: {
                name: 'meta-tool',
                arguments: { _meta: { fromArgs: 'a', shared: 'args' }, foo: 'bar' },
                _meta: { fromParams: 'p', shared: 'params' },
            },
        });

        const context = (tool.execute as any).mock.calls[0][1];
        expect(context.metadata.fromArgs).toBe('a');
        expect(context.metadata.fromParams).toBe('p');
        // params._meta takes precedence over arguments._meta
        expect(context.metadata.shared).toBe('params');
    });

    it('keeps legacy arguments._meta behavior for Studio clients', async () => {
        const mcpInstance = (McpServer as any).mock.results[0].value;
        const callTool = getCallToolHandler(mcpInstance);
        const tool = makeTool('legacy-tool');
        server.tool(tool as any);

        await callTool({
            params: { name: 'legacy-tool', arguments: { _meta: { authorization: 'Bearer studio-token' } } },
        });

        const context = (tool.execute as any).mock.calls[0][1];
        expect(context.metadata.authorization).toBe('Bearer studio-token');
    });

    it('bridges the session authHeader into context metadata', async () => {
        const sessionContext = { authHeader: 'Bearer session-token' };
        const sessionMcp = server.createConfiguredMcpServer(sessionContext as any);
        const callTool = getCallToolHandler(sessionMcp);
        const tool = makeTool('auth-tool');
        server.tool(tool as any);

        await callTool({ params: { name: 'auth-tool', arguments: {} } });

        const context = (tool.execute as any).mock.calls[0][1];
        expect(context.metadata.authorization).toBe('Bearer session-token');
    });

    it('lets explicit _meta.authorization win over the captured header', async () => {
        const sessionContext = { authHeader: 'Bearer session-token' };
        const sessionMcp = server.createConfiguredMcpServer(sessionContext as any);
        const callTool = getCallToolHandler(sessionMcp);
        const tool = makeTool('explicit-tool');
        server.tool(tool as any);

        await callTool({
            params: { name: 'explicit-tool', arguments: {}, _meta: { authorization: 'Bearer explicit' } },
        });

        const context = (tool.execute as any).mock.calls[0][1];
        expect(context.metadata.authorization).toBe('Bearer explicit');
    });

    it('forwards the session context through the transport factory registration', async () => {
        // Regression: the factory closures passed to setMcpServerFactory must
        // forward sessionContext, otherwise the transport-captured auth header
        // never reaches the per-session MCP server (caught by e2e testing).
        const originalTransport = process.env.MCP_TRANSPORT_TYPE;
        process.env.MCP_TRANSPORT_TYPE = 'http';
        try {
            await server.start();
        } finally {
            process.env.MCP_TRANSPORT_TYPE = originalTransport;
        }

        const { StreamableHttpTransport } = await import('../transports/streamable-http.js');
        const transportInstances = (StreamableHttpTransport as any).mock.results;
        expect(transportInstances.length).toBeGreaterThan(0);
        const transportInstance = transportInstances[transportInstances.length - 1].value;
        const factory = transportInstance.setMcpServerFactory.mock.calls[0]?.[0];
        expect(factory).toBeDefined();

        const sessionMcp = factory({ authHeader: 'Bearer forwarded-token' });
        const callTool = getCallToolHandler(sessionMcp);
        const tool = makeTool('forwarded-tool');
        server.tool(tool as any);

        await callTool({ params: { name: 'forwarded-tool', arguments: {} } });

        const context = (tool.execute as any).mock.calls[0][1];
        expect(context.metadata.authorization).toBe('Bearer forwarded-token');
    });

    it('stores the auth header on legacy SSE session context', async () => {
        const res = {} as any;
        await (server as any).startLegacySdkSseSession(res, '/mcp/messages', 'Bearer sse-token');

        const sessions = Array.from((server as any).legacySdkSseSessions.values()) as any[];
        expect(sessions).toHaveLength(1);
        expect(sessions[0].sessionContext.authHeader).toBe('Bearer sse-token');

        // The per-session MCP server handler sees the bridged header
        const callTool = getCallToolHandler(sessions[0].server);
        const tool = makeTool('sse-tool');
        server.tool(tool as any);
        await callTool({ params: { name: 'sse-tool', arguments: {} } });

        const context = (tool.execute as any).mock.calls[0][1];
        expect(context.metadata.authorization).toBe('Bearer sse-token');
    });
});
