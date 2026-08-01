import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { NitroStackServer as NitroStackServerType } from '../server';
// Static imports for types
import { z } from 'zod';

// Mock dependencies
jest.unstable_mockModule('@modelcontextprotocol/sdk/server/index.js', () => ({
    Server: jest.fn().mockImplementation(() => ({
        connect: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined as never),
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
        setServerConfig: jest.fn(),
        setMcpServerFactory: jest.fn(),
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

    it('should invoke lifecycle hooks on resolved modules and services in order', async () => {
        const order: string[] = [];

        class HookService {
            onModuleInit() {
                order.push('service:init');
            }
            onApplicationBootstrap() {
                order.push('service:bootstrap');
            }
            onModuleDestroy() {
                order.push('service:destroy');
            }
            beforeApplicationShutdown(signal?: string) {
                order.push(`service:beforeShutdown:${signal}`);
            }
            onApplicationShutdown(signal?: string) {
                order.push(`service:shutdown:${signal}`);
            }
        }

        @Module({
            name: 'hook-module',
            providers: [HookService]
        })
        class HookModule {
            constructor(public service: HookService) {}

            onModuleInit() {
                order.push('module:init');
            }
            onApplicationBootstrap() {
                order.push('module:bootstrap');
            }
            onModuleDestroy() {
                order.push('module:destroy');
            }
            beforeApplicationShutdown(signal?: string) {
                order.push(`module:beforeShutdown:${signal}`);
            }
            onApplicationShutdown(signal?: string) {
                order.push(`module:shutdown:${signal}`);
            }
        }

        // Clear DI container singleton to avoid registration conflicts
        const { DIContainer: RealDI } = await import('../di/container.js');
        RealDI.getInstance().clear();

        // Create new server instance after clearing DI container
        const localServer = new NitroStackServer();
        localServer.module(HookModule);

        await localServer.start();

        // Exact startup order: all inits, then all bootstraps (before listen/connect)
        expect(order).toEqual(['service:init', 'module:init', 'service:bootstrap', 'module:bootstrap']);

        const mcpInstance = (McpServer as unknown as jest.Mock<any>).mock.results.at(-1)?.value;
        expect(mcpInstance.connect).toHaveBeenCalled();

        // Now stop with signal
        order.length = 0;
        await localServer.stop('SIGTERM');

        // Exact stop order: destroys, beforeShutdowns, then shutdowns
        expect(order).toEqual([
            'service:destroy',
            'module:destroy',
            'service:beforeShutdown:SIGTERM',
            'module:beforeShutdown:SIGTERM',
            'service:shutdown:SIGTERM',
            'module:shutdown:SIGTERM',
        ]);
    });

    it('should continue teardown even if a shutdown hook throws an error', async () => {
        const order: string[] = [];

        class ThrowingService {
            onModuleDestroy() {
                order.push('throwing-service:destroy:before-throw');
                throw new Error('Teardown crash!');
            }
            onApplicationShutdown() {
                order.push('throwing-service:shutdown');
            }
        }

        class NormalService {
            onModuleDestroy() {
                order.push('normal-service:destroy');
            }
            onApplicationShutdown() {
                order.push('normal-service:shutdown');
            }
        }

        @Module({
            name: 'faulty-module',
            providers: [ThrowingService, NormalService]
        })
        class FaultyModule {
            constructor(public throwing: ThrowingService, public normal: NormalService) {}
        }

        const { DIContainer: RealDI } = await import('../di/container.js');
        RealDI.getInstance().clear();

        const localServer = new NitroStackServer();
        localServer.module(FaultyModule);

        await localServer.start();
        
        // Clear order log before stopping
        order.length = 0;
        
        // Stop server, which should execute triggerLifecycleHook safely and not throw
        await expect(localServer.stop('SIGTERM')).resolves.not.toThrow();

        // Verify that subsequent destruction hook and shutdown hooks are still executed
        expect(order).toEqual(
            expect.arrayContaining([
                'throwing-service:destroy:before-throw',
                'normal-service:destroy',
                'throwing-service:shutdown',
                'normal-service:shutdown'
            ])
        );
    });

    it('should run onModuleInit for instances registered during module.start()', async () => {
        const order: string[] = [];

        class LateService {
            onModuleInit() {
                order.push('late:init');
            }
            onApplicationBootstrap() {
                order.push('late:bootstrap');
            }
        }

        @Module({
            name: 'late-module',
            providers: []
        })
        class LateModule {
            onModuleInit() {
                order.push('module:init');
            }
            onApplicationBootstrap() {
                order.push('module:bootstrap');
            }
            async start() {
                const { DIContainer: RealDI } = await import('../di/container.js');
                RealDI.getInstance().register(LateService);
                RealDI.getInstance().resolve(LateService);
                order.push('module:start');
            }
        }

        const { DIContainer: RealDI } = await import('../di/container.js');
        RealDI.getInstance().clear();

        const localServer = new NitroStackServer();
        localServer.module(LateModule);

        await localServer.start();

        expect(order).toEqual([
            'module:init',
            'module:start',
            'late:init',
            'module:bootstrap',
            'late:bootstrap',
        ]);
    });

    it('should run onApplicationShutdown even if mcpServer.close throws', async () => {
        const order: string[] = [];

        @Module({
            name: 'close-fail-module',
            providers: []
        })
        class CloseFailModule {
            onApplicationShutdown(signal?: string) {
                order.push(`shutdown:${signal}`);
            }
        }

        const { DIContainer: RealDI } = await import('../di/container.js');
        RealDI.getInstance().clear();

        const localServer = new NitroStackServer();
        localServer.module(CloseFailModule);
        await localServer.start();

        const mcpInstance = (McpServer as unknown as jest.Mock<any>).mock.results.at(-1)?.value;
        mcpInstance.close.mockRejectedValueOnce(new Error('close failed'));

        await expect(localServer.stop('SIGTERM')).rejects.toThrow('close failed');
        expect(order).toEqual(['shutdown:SIGTERM']);
    });

    it('should deduplicate instances to run hooks exactly once per instance', async () => {
        const order: string[] = [];
        const instance = {
            onModuleInit() {
                order.push('instance:init');
            }
        };

        const { triggerLifecycleHook: trigger } = await import('../lifecycle.js');

        // Pass duplicate instances in the array
        await trigger([instance, instance, instance], 'onModuleInit');

        expect(order).toEqual(['instance:init']);
    });

    it('should support function instances with lifecycle hooks', async () => {
        const order: string[] = [];
        const fnInstance = Object.assign(() => {}, {
            onModuleInit() {
                order.push('function:init');
            }
        });

        const { triggerLifecycleHook: trigger } = await import('../lifecycle.js');

        await trigger([fnInstance], 'onModuleInit');

        expect(order).toEqual(['function:init']);
    });

    it('should not abort teardown when a throwing getter is hit in safe mode', async () => {
        const order: string[] = [];

        // Instance whose hook property throws on access (e.g. throwing getter / proxy)
        const throwingGetterInstance = {};
        Object.defineProperty(throwingGetterInstance, 'onApplicationShutdown', {
            get() {
                throw new Error('getter boom');
            },
            enumerable: true,
        });

        const normalInstance = {
            onApplicationShutdown() {
                order.push('normal:shutdown');
            }
        };

        const logger = { error: jest.fn() };
        const { triggerLifecycleHook: trigger } = await import('../lifecycle.js');

        await expect(
            trigger([throwingGetterInstance, normalInstance], 'onApplicationShutdown', { safe: true, logger })
        ).resolves.not.toThrow();

        // The throwing lookup is logged, and later instances still run
        expect(logger.error).toHaveBeenCalled();
        expect(order).toEqual(['normal:shutdown']);
    });

    it('should rethrow a throwing getter lookup when not in safe mode', async () => {
        const throwingGetterInstance = {};
        Object.defineProperty(throwingGetterInstance, 'onModuleInit', {
            get() {
                throw new Error('getter boom');
            },
            enumerable: true,
        });

        const { triggerLifecycleHook: trigger } = await import('../lifecycle.js');

        await expect(
            trigger([throwingGetterInstance], 'onModuleInit')
        ).rejects.toThrow('getter boom');
    });

    it('should run shutdown hooks when an OS signal is received via enableShutdownHooks', async () => {
        const order: string[] = [];

        @Module({ name: 'signal-module', providers: [] })
        class SignalModule {
            beforeApplicationShutdown(signal?: string) {
                order.push(`beforeShutdown:${signal}`);
            }
            onApplicationShutdown(signal?: string) {
                order.push(`shutdown:${signal}`);
            }
        }

        const { DIContainer: RealDI } = await import('../di/container.js');
        RealDI.getInstance().clear();

        const localServer = new NitroStackServer();
        localServer.module(SignalModule);
        await localServer.start();

        const before = process.listenerCount('SIGTERM');
        localServer.enableShutdownHooks(['SIGTERM']);
        expect(process.listenerCount('SIGTERM')).toBe(before + 1);

        // Emit the signal to trigger the registered handler
        (process as NodeJS.EventEmitter).emit('SIGTERM');
        await (localServer as any)._stopping;

        expect(order).toEqual(['beforeShutdown:SIGTERM', 'shutdown:SIGTERM']);
        // Handlers should be cleaned up after shutdown to avoid listener leaks
        expect(process.listenerCount('SIGTERM')).toBe(before);
    });

    it('should not double-register signal handlers across enableShutdownHooks calls', async () => {
        const { DIContainer: RealDI } = await import('../di/container.js');
        RealDI.getInstance().clear();

        const localServer = new NitroStackServer();
        const before = process.listenerCount('SIGINT');

        localServer.enableShutdownHooks(['SIGINT']);
        localServer.enableShutdownHooks(['SIGINT']);
        expect(process.listenerCount('SIGINT')).toBe(before + 1);

        // Cleanup so the listener does not leak into other tests
        await localServer.stop();
        expect(process.listenerCount('SIGINT')).toBe(before);
    });

    it('should run init/bootstrap hooks for declared-but-uninjected providers and controllers', async () => {
        const order: string[] = [];

        class UnusedService {
            onModuleInit() {
                order.push('service:init');
            }
            onApplicationBootstrap() {
                order.push('service:bootstrap');
            }
        }

        class HookController {
            @Tool({ name: 'hook-ctrl-tool', description: 'd', inputSchema: z.object({}) })
            run() { }
            onModuleInit() {
                order.push('controller:init');
            }
            onApplicationBootstrap() {
                order.push('controller:bootstrap');
            }
        }

        @Module({
            name: 'eager-module',
            controllers: [HookController],
            providers: [UnusedService]
        })
        class EagerModule { }

        const { DIContainer: RealDI } = await import('../di/container.js');
        RealDI.getInstance().clear();

        const localServer = new NitroStackServer();
        localServer.module(EagerModule);
        await localServer.start();

        expect(order).toEqual(
            expect.arrayContaining([
                'service:init',
                'controller:init',
                'service:bootstrap',
                'controller:bootstrap'
            ])
        );
        // Each hook must run exactly once per instance
        expect(order.filter((o) => o === 'service:init')).toHaveLength(1);
        expect(order.filter((o) => o === 'controller:init')).toHaveLength(1);
    });

    it('should run teardown hooks only once when stop() is called multiple times', async () => {
        const order: string[] = [];

        @Module({ name: 'idempotent-module', providers: [] })
        class IdempotentModule {
            onModuleDestroy() {
                order.push('destroy');
            }
            onApplicationShutdown() {
                order.push('shutdown');
            }
        }

        const { DIContainer: RealDI } = await import('../di/container.js');
        RealDI.getInstance().clear();

        const localServer = new NitroStackServer();
        localServer.module(IdempotentModule);
        await localServer.start();

        order.length = 0;

        // Concurrent + repeated calls should share a single teardown
        await Promise.all([localServer.stop('SIGTERM'), localServer.stop('SIGTERM')]);
        await localServer.stop('SIGTERM');

        expect(order).toEqual(['destroy', 'shutdown']);
    });

    it('should continue teardown when a module stop() throws', async () => {
        const order: string[] = [];

        @Module({ name: 'faulty-stop-module', providers: [] })
        class FaultyStopModule {
            async stop() {
                order.push('faulty:stop');
                throw new Error('module stop failed');
            }
            onApplicationShutdown() {
                order.push('faulty:shutdown');
            }
        }

        @Module({ name: 'normal-stop-module', providers: [] })
        class NormalStopModule {
            async stop() {
                order.push('normal:stop');
            }
            onApplicationShutdown() {
                order.push('normal:shutdown');
            }
        }

        const { DIContainer: RealDI } = await import('../di/container.js');
        RealDI.getInstance().clear();

        const localServer = new NitroStackServer();
        localServer.module(FaultyStopModule);
        localServer.module(NormalStopModule);
        await localServer.start();

        order.length = 0;

        // A throwing module.stop() must not abort teardown of the other modules
        await expect(localServer.stop('SIGTERM')).resolves.not.toThrow();

        expect(order).toEqual(
            expect.arrayContaining([
                'faulty:stop',
                'normal:stop',
                'faulty:shutdown',
                'normal:shutdown'
            ])
        );
    });

    it('should use a single controller instance for tools and lifecycle hooks via server.module()', async () => {
        let constructed = 0;

        // Non-@Injectable controller registered via server.module()
        class CtrlWithHook {
            value = 0;
            constructor() {
                constructed++;
            }
            @Tool({ name: 'get-value', description: 'd', inputSchema: z.object({}) })
            getValue() {
                return this.value;
            }
            onModuleInit() {
                this.value = 42;
            }
        }

        @Module({
            name: 'single-instance-module',
            controllers: [CtrlWithHook]
        })
        class SingleInstanceModule { }

        const { DIContainer: RealDI } = await import('../di/container.js');
        RealDI.getInstance().clear();

        const localServer = new NitroStackServer();
        localServer.module(SingleInstanceModule);
        await localServer.start();

        // Exactly one instance was constructed (no tool-vs-hook divergence)
        expect(constructed).toBe(1);

        // The instance backing the tools is the same one that received onModuleInit
        const resolved = RealDI.getInstance().resolve(CtrlWithHook) as any;
        expect(resolved.value).toBe(42);
    });
});
