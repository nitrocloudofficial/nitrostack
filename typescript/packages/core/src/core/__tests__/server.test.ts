import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { NitroStackServer as NitroStackServerType } from '../server';
// Static imports for types
import { z } from 'zod';

// Mock dependencies
jest.unstable_mockModule('@modelcontextprotocol/sdk/server/index.js', () => ({
    Server: jest.fn().mockImplementation(() => ({
        connect: jest.fn(),
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
// core/transports/streamable-http.ts likely needs mocking because it imports express/http
// But server.ts imports it.
// If server.ts imports '../transports/streamable-http.js', we might need to mock that too if it has side effects
// or mock the whole module to avoid its dependencies.
// Let's try mocking it.
jest.unstable_mockModule('../transports/streamable-http.js', () => ({
    StreamableHttpTransport: jest.fn().mockImplementation(() => ({
        start: jest.fn().mockResolvedValue(undefined as never),
        close: jest.fn(),
        setToolsCallback: jest.fn(),
        setServerConfig: jest.fn()
    }))
}));


// Dynamic imports for values
const { Server: McpServer } = await import('@modelcontextprotocol/sdk/server/index.js');
const { NitroStackServer } = await import('../server');
const { Tool } = await import('../decorators');
const { Module } = await import('../module');

// Define classes here
class TestTool {
    @Tool({ name: 'test-tool', description: 'test', inputSchema: z.object({}) })
    execute() { return 'result'; }
}

class TestController {
    @Tool({ name: 'ctrl-tool', description: 'desc', inputSchema: z.object({}) })
    run() { }
}

@Module({
    name: 'test-module',
    controllers: [TestController]
})
class TestModule { }

class NotAModule { }

describe('NitroStackServer', () => {
    let server: NitroStackServerType;

    beforeEach(() => {
        jest.clearAllMocks();
        server = new NitroStackServer();
    });

    it('should initialize McpServer', () => {
        expect(McpServer).toHaveBeenCalled();
    });

    it('should register a tool', () => {
        const tool = {
            name: 'test-tool',
            description: 'test',
            inputSchema: z.object({}),
            execute: jest.fn(),
            toMcpTool: () => ({ name: 'test-tool', inputSchema: {} } as any),
            hasComponent: () => false,
            getComponent: () => undefined
        };

        server.tool(tool as any);

        // Verify tool stored in private map
        expect((server as any).tools.has('test-tool')).toBe(true);
    });

    it('should register a module with controllers', () => {
        server.module(TestModule);

        // Verify tool from controller stored in private map
        expect((server as any).tools.has('ctrl-tool')).toBe(true);
    });

    it('should throw if class is not a module', () => {
        expect(() => server.module(NotAModule)).toThrow();
    });

    it('should start the server', async () => {
        await server.start();

        const mcpInstance = (McpServer as unknown as jest.Mock<any>).mock.results[0].value;
        expect(mcpInstance.connect).toHaveBeenCalled();
    });
});
