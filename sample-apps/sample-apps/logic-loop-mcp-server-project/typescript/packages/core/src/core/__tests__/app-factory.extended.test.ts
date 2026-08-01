import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { McpApp, McpApplicationFactory } from '../app-decorator.js';
import { Module } from '../module.js';
import { Tool as ToolDecorator } from '../decorators.js';
import { Tool } from '../tool.js';
import { DIContainer } from '../di/container.js';
import { z } from 'zod';

// Mock dependencies
jest.mock('../health/health-checks.resource.js', () => ({
    // @ts-ignore
    buildHealthChecksResource: jest.fn().mockResolvedValue({
        uri: 'mcp://health',
        name: 'Health',
        description: 'Health',
        mimeType: 'text/plain',
        // @ts-ignore
        read: jest.fn().mockResolvedValue('ok')
    })
}));

describe('McpApplicationFactory & Tool Pipeline', () => {
    beforeEach(() => {
        DIContainer.getInstance().clear();
        jest.clearAllMocks();
    });

    it('should bootstrap a complex application with controllers and health checks', async () => {
        class MockHealthCheck {
            check() { return { status: 'ok' }; }
        }
        Reflect.defineMetadata('nitrostack:health_check', { name: 'DB' }, MockHealthCheck);

        class TestController {
            @ToolDecorator({ name: 'hello', description: 'desc', inputSchema: {} as any })
            async hello() { return 'hi'; }
        }

        @Module({
            name: 'SubModule',
            providers: [
                { provide: 'Config', useValue: { api: 'test' } },
                MockHealthCheck
            ],
            controllers: [TestController]
        })
        class SubModule { }

        @Module({
            name: 'RootModule',
            imports: [
                SubModule,
                // Dynamic module style
                {
                    module: class DynamicMod { },
                    providers: [{ provide: 'Dynamic', useValue: 'val' }]
                } as any
            ],
            providers: [],
            controllers: []
        })
        class RootModule { }

        @McpApp({
            module: RootModule,
            server: { name: 'TestApp', version: '1.2.3' },
            logging: { level: 'debug' }
        })
        class App { }

        const server = await McpApplicationFactory.create(App);
        expect(server).toBeDefined();
        expect(DIContainer.getInstance().resolve('Config')).toEqual({ api: 'test' });
        expect(DIContainer.getInstance().resolve('Dynamic')).toBe('val');
    });

    it('should throw if @McpApp is missing', async () => {
        class NoApp { }
        await expect(McpApplicationFactory.create(NoApp)).rejects.toThrow('is not decorated with @McpApp');
    });

    it('should throw if @Module is missing on the root module', async () => {
        class NoModule { }
        @McpApp({ module: NoModule })
        class App { }
        await expect(McpApplicationFactory.create(App)).rejects.toThrow('is not decorated with @Module');
    });

    it('should auto-detect HTTP transport if OAuth is configured', async () => {
        // Mock OAuth configuration
        const { OAuthModule } = await import('../oauth-module.js');
        jest.spyOn(OAuthModule, 'getConfig').mockReturnValue({
            resourceUri: 'http://localhost:4000/mcp',
            authorizationServers: ['http://auth.com'],
            http: { port: 4001, host: '127.0.0.1' }
        } as any);

        @Module({ name: 'RootModule' }) class RootModule { }
        @McpApp({ module: RootModule }) class App { }

        const server = await McpApplicationFactory.create(App);
        const internal = server as any;
        expect(internal._transportType).toBe('dual');
        expect(internal._transportOptions.port).toBe(4001);
    });

    it('should execute tool with full pipeline (Guards, Middleware, Interceptors, Pipes)', async () => {
        const pipeline: string[] = [];

        class TestGuard {
            async canActivate() {
                pipeline.push('guard');
                return true;
            }
        }

        class TestMiddleware {
            async use(context: any, next: any) {
                pipeline.push('mw-before');
                const res = await next();
                pipeline.push('mw-after');
                return res;
            }
        }

        class TestInterceptor {
            async intercept(context: any, next: any) {
                pipeline.push('inter-before');
                const res = await next();
                pipeline.push('inter-after');
                return res;
            }
        }

        class TestPipe {
            async transform(value: any) {
                pipeline.push('pipe');
                return value + '!';
            }
        }

        const tool = new Tool({
            name: 'test-tool',
            description: 'desc',
            inputSchema: { type: 'string' },
            handler: async (input) => {
                pipeline.push('handler');
                return `Hello ${input}`;
            },
            guards: [TestGuard as any],
            middlewares: [TestMiddleware as any],
            interceptors: [TestInterceptor as any],
            pipes: [TestPipe as any]
        });

        const result = await tool.execute('World', {} as any);
        expect(result).toBe('Hello World!');
        expect(pipeline).toEqual([
            'guard',
            'mw-before',
            'inter-before',
            'pipe',
            'handler',
            'inter-after',
            'mw-after'
        ]);
    });

    it('should handle tool execution errors with Exception Filters', async () => {
        class TestFilter {
            async catch(error: any) {
                return `Handled: ${error.message}`;
            }
        }

        const tool = new Tool({
            name: 'error-tool',
            description: 'desc',
            inputSchema: { type: 'string' },
            handler: async () => {
                throw new Error('Boom');
            },
            filters: [TestFilter as any]
        });

        const result = await tool.execute({}, {} as any);
        expect(result).toBe('Handled: Boom');
    });

    it('should convert Zod schema to MCP tool format', async () => {
        const tool = new Tool({
            name: 'zod-tool',
            description: 'zod desc',
            inputSchema: z.object({
                name: z.string().describe('User name'),
                age: z.number().optional()
            }),
            handler: async () => 'ok',
            examples: { request: { name: 'Alice' } },
            isInitial: true
        });

        const mcpTool = await tool.toMcpTool();
        expect(mcpTool.name).toBe('zod-tool');
        expect(mcpTool.inputSchema.type).toBe('object');
        // @ts-ignore
        expect(mcpTool.inputSchema.properties.name.description).toBe('User name');
        // @ts-ignore
        expect(mcpTool._meta['tool/initial']).toBe(true);
        // @ts-ignore
        expect(mcpTool._meta['tool/examples']).toEqual({ request: { name: 'Alice' } });
    });

    it('should integrate component metadata in toMcpTool', async () => {
        const mockComponent = {
            getResourceUri: () => 'mcp://widgets/test',
            getResourceMetadata: () => ({ 'openai/widgetDescription': 'A test widget' })
        };

        const tool = new Tool({
            name: 'ui-tool',
            description: 'desc',
            inputSchema: { type: 'object' },
            handler: async () => 'ok'
        });
        tool.setComponent(mockComponent as any);

        const mcpTool = await tool.toMcpTool();
        // @ts-ignore
        expect(mcpTool._meta['ui/template']).toBe('mcp://widgets/test');
        // @ts-ignore
        expect(mcpTool._meta['openai/widgetDescription']).toBe('A test widget');
    });
});
