import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { NitroStackServer as NitroStackServerType } from '../server';
// Static imports for types
import { z } from 'zod';

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
        onmessage: undefined,
        name: 'test',
        version: '1.0.0'
    }))
}));

// Mock DIContainer
jest.unstable_mockModule('../di/container.js', () => ({
    DIContainer: {
        getInstance: jest.fn().mockReturnValue({
            resolve: jest.fn()
        })
    }
}));

// Mock builders
jest.unstable_mockModule('../builders.js', () => ({
    buildController: jest.fn().mockReturnValue({
        tools: [],
        resources: [],
        prompts: []
    })
}));

// Mock module utils
jest.unstable_mockModule('../module.js', () => ({
    Module: jest.fn((meta: any) => (target: any) => {
        Reflect.defineMetadata('nitro:module', meta, target);
        return target;
    }),
    isModule: jest.fn().mockReturnValue(true),
    getModuleMetadata: jest.fn().mockImplementation((m: any) => Reflect.getMetadata('nitro:module', m))
}));

// Dynamic imports
const { Server: McpServer } = await import('@modelcontextprotocol/sdk/server/index.js');
const { NitroStackServer } = await import('../server');
const { DIContainer } = await import('../di/container.js');
const builders = await import('../builders.js');
const moduleUtils = await import('../module.js');

// Test classes
class TestLifecycleModule {
    onModuleInit = jest.fn();
    start = jest.fn();
    stop = jest.fn();
}

describe('NitroStackServer Extended Tests', () => {
    let server: NitroStackServerType;

    beforeEach(() => {
        jest.clearAllMocks();
        server = new NitroStackServer({
            name: 'test-server',
            version: '1.0.0'
        });
    });

    it('should cover statistics, stop, context and errors', async () => {
        await server.start();
        expect(server.getStats()).toBeDefined();

        const mcpInstance = (McpServer as any).mock.results[0].value;
        if (mcpInstance.onerror) {
            mcpInstance.onerror(new Error('mcp error'));
            expect(server.getStats().errors).toBeGreaterThan(0);
        }

        await server.stop();
        const context = (server as any).createContext();
        expect(context.metadata).toBeDefined();
    });

    it('should cover all MCP handlers', async () => {
        const mcpInstance = (McpServer as any).mock.results[0].value;
        await server.start();

        const calls = mcpInstance.setRequestHandler.mock.calls;
        const listTools = calls[0][1];
        const callTool = calls[1][1];
        const listRes = calls[2][1];
        const readRes = calls[3][1];
        const listPrompts = calls[4][1];
        const getPrompt = calls[5][1];

        // 1. Tool Listing
        await listTools();

        // 2. Call Tool
        const tool = {
            name: 't1',
            execute: jest.fn().mockImplementation(async () => 'ok'),
            toMcpTool: () => ({ name: 't1' } as any),
            hasComponent: () => false,
            getComponent: () => undefined
        };
        server.tool(tool as any);
        await callTool({ params: { name: 't1', arguments: {} } });

        // Not found throws
        await expect(callTool({ params: { name: 'non-existent', arguments: {} } })).rejects.toThrow();

        // Tool error - returns isError: true
        (tool.execute as any).mockImplementation(async () => { throw new Error('fail'); });
        const res = await callTool({ params: { name: 't1', arguments: {} } });
        expect(res.isError).toBe(true);

        // Tool with component
        const component = {
            id: 'c1',
            transformData: jest.fn().mockImplementation(async (d: any) => ({ transformed: d })),
            getWidgetMeta: jest.fn().mockImplementation(async () => ({ meta: 1 })),
            compile: jest.fn(async () => { }),
            getResourceUri: () => 'component://c1',
            getBundle: () => '<html></html>'
        };
        const toolWithComp = {
            name: 'tc',
            execute: jest.fn().mockImplementation(async () => ({ val: 1 })),
            hasComponent: () => true,
            getComponent: () => component,
            toMcpTool: () => ({ name: 'tc' } as any)
        };
        server.tool(toolWithComp as any);
        await callTool({ params: { name: 'tc', arguments: { _meta: { user: 'a' } } } });

        // 3. List Resources
        await listRes();

        // 4. Read Resource
        const resource = {
            uri: 'r1',
            fetch: jest.fn().mockImplementation(async () => ({ type: 'text', data: 'val' })),
            toMcpResource: () => ({ uri: 'r1', name: 'r1' } as any),
            mimeType: 'text/html'
        };
        server.resource(resource as any);
        await readRes({ params: { uri: 'r1' } });

        // Types: binary and json
        (resource.fetch as any).mockImplementation(async () => ({ type: 'binary', data: Buffer.from('bin') }));
        await readRes({ params: { uri: 'r1' } });
        (resource.fetch as any).mockImplementation(async () => ({ type: 'json', data: { j: 1 } }));
        await readRes({ params: { uri: 'r1' } });

        await expect(readRes({ params: { uri: 'non-existent' } })).rejects.toThrow();

        // Resource error
        (resource.fetch as any).mockImplementation(async () => { throw new Error('fail'); });
        await expect(readRes({ params: { uri: 'r1' } })).rejects.toThrow();

        // 5. List Prompts
        await listPrompts();

        // 6. Get Prompt
        const prompt = {
            name: 'p1',
            execute: jest.fn().mockImplementation(async () => [{ role: 'user', content: 'txt' }]),
            toMcpPrompt: () => ({ name: 'p1' } as any)
        };
        server.prompt(prompt as any);
        await getPrompt({ params: { name: 'p1', arguments: {} } });

        (prompt.execute as any).mockImplementation(async () => { throw new Error('fail'); });
        await expect(getPrompt({ params: { name: 'p1' } })).rejects.toThrow();
        await expect(getPrompt({ params: { name: 'non-existent' } })).rejects.toThrow();
    });

    it('should cover production component handlers completely', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        jest.unstable_mockModule('fs', () => ({
            existsSync: jest.fn().mockImplementation((p: any) => (p as string).includes('out')),
            readFileSync: jest.fn().mockReturnValue('<html>PROD</html>')
        }));

        const component = {
            id: 'c-prod',
            compile: jest.fn(async () => { }),
            getResourceUri: () => 'component://prod',
            getBundle: () => '<html>DEV</html>',
            getResourceMetadata: () => ({ x: 1 })
        };
        const tool = {
            name: 'tp',
            execute: jest.fn(),
            hasComponent: () => true,
            getComponent: () => component,
            toMcpTool: () => ({ name: 'tp' } as any)
        };
        server.tool(tool as any);
        await Promise.allSettled((server as any).pendingComponentRegistrations);

        const mcpInstance = (McpServer as any).mock.results[0].value;
        const readRes = mcpInstance.setRequestHandler.mock.calls[3][1];

        await readRes({ params: { uri: 'component://prod' } });
        const fs = await import('fs');
        (fs.existsSync as any).mockReturnValue(false);
        await readRes({ params: { uri: 'component://prod' } });

        (fs.existsSync as any).mockImplementation(() => { throw new Error('fs fail'); });
        await readRes({ params: { uri: 'component://prod' } });

        process.env.NODE_ENV = originalEnv;
    });

    it('should cover module processing with tools, resources, prompts', async () => {
        (moduleUtils.isModule as any).mockReturnValue(true);
        (moduleUtils.getModuleMetadata as any).mockReturnValue({
            controllers: [class { }]
        });
        (builders.buildController as any).mockReturnValue({
            tools: [{ name: 'mt', toMcpTool: () => ({ name: 'mt' } as any), hasComponent: () => false }],
            resources: [{ uri: 'mr', toMcpResource: () => ({ uri: 'mr' } as any) }],
            prompts: [{ name: 'mp', toMcpPrompt: () => ({ name: 'mp' } as any) }]
        });

        server.module(class { } as any);
        expect((server as any).tools.has('mt')).toBe(true);
        expect((server as any).resources.has('mr')).toBe(true);
        expect((server as any).prompts.has('mp')).toBe(true);

        (moduleUtils.isModule as any).mockReturnValue(false);
        expect(() => server.module(class { } as any)).toThrow();
    });

    it('should cover transport setup branches', async () => {
        const originalTransport = process.env.MCP_TRANSPORT_TYPE;
        const originalEnv = process.env.NODE_ENV;

        // Dual mode
        process.env.MCP_TRANSPORT_TYPE = 'dual';
        await server.start();

        // Stdio mode
        delete process.env.MCP_TRANSPORT_TYPE;
        process.env.NODE_ENV = 'development';
        await server.start();

        process.env.MCP_TRANSPORT_TYPE = originalTransport;
        process.env.NODE_ENV = originalEnv;
    });
});
