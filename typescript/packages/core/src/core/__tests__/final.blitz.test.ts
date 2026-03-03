import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { StreamableHttpTransport } from '../transports/streamable-http.js';
import { NitroStackServer } from '../server.js';
import { DIContainer } from '../di/container.js';
import { RateLimit, InMemoryRateLimitStorage, resetRateLimit } from '../decorators/rate-limit.decorator.js';
import { HealthCheck, registerHealthCheck, getAllHealthChecks, getHealthCheck, getOverallHealth } from '../decorators/health-check.decorator.js';
import { EventEmitter } from '../events/event-emitter.js';
import { OnEvent, registerEventHandlers, emitEvent } from '../events/event.decorator.js';

describe('Final Blitz Coverage Tests', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        DIContainer.getInstance().clear();
        jest.useRealTimers();
        Object.keys(process.env).forEach(key => delete process.env[key]);
        Object.assign(process.env, originalEnv);
        delete process.env.MCP_TRANSPORT_TYPE;
        delete process.env.NODE_ENV;
        delete process.env.PORT;
    });

    afterEach(() => {
        Object.keys(process.env).forEach(key => delete process.env[key]);
        Object.assign(process.env, originalEnv);
    });

    describe('StreamableHttpTransport Setters & Routes', () => {
        let transport: StreamableHttpTransport;
        const port = 3120;

        beforeEach(async () => {
            transport = new StreamableHttpTransport({ port, enableSessions: true });
            await transport.start();
        });

        afterEach(async () => {
            await transport.close();
        });

        it('should cover setters and close handler', () => {
            const onMsg = jest.fn();
            const onClose = jest.fn();
            const onError = jest.fn();

            // @ts-ignore
            transport.onmessage = onMsg as any;
            // @ts-ignore
            transport.onclose = onClose as any;
            // @ts-ignore
            transport.onerror = onError as any;

            expect((transport as any).messageHandler).toBe(onMsg);
            expect((transport as any).closeHandler).toBe(onClose);
            expect((transport as any).errorHandler).toBe(onError);

            // Trigger error handler manually
            (transport as any).errorHandler(new Error('test'));
            expect(onError).toHaveBeenCalled();
        });

        it('should cover /mcp/message routes and handlePost errors', async () => {
            const baseUrl = `http://localhost:${port}/mcp`;

            // GET /mcp/message
            const res1 = await fetch(`${baseUrl}/message`);
            expect(res1.status).toBe(200);

            // POST /mcp/message (valid)
            const res2 = await fetch(`${baseUrl}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'ping' })
            });
            expect([200, 202]).toContain(res2.status);

            // POST /mcp/message (invalid)
            const res3 = await fetch(`${baseUrl}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ping: true })
            });
            expect(res3.status).toBe(400);

            // POST /mcp (invalid jsonrpc version)
            const res4 = await fetch(baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '1.0', method: 'ping' })
            });
            expect(res4.status).toBe(400);
        });

        it('should cover production documentation and host parsing', async () => {
            process.env.NODE_ENV = 'production';

            const prodTransport = new StreamableHttpTransport({ port: 3121 });
            await prodTransport.start();

            // Test documentation route
            const res = await fetch('http://localhost:3121/', {
                headers: { 'Host': 'localhost:3121', 'X-Forwarded-Proto': 'https' }
            });
            expect(res.status).toBe(200);
            const text = await res.text();
            expect(text).toContain('Documentation');

            await prodTransport.close();
        });
    });

    describe('NitroStackServer Transports & Error Paths', () => {
        it('should start in dual mode when configured', async () => {
            process.env.MCP_TRANSPORT_TYPE = 'dual';
            process.env.PORT = '3125';
            process.env.NODE_ENV = 'production';

            const server = new NitroStackServer({ name: 'DualServer', version: '1' });
            (server as any).mcpServer = {
                connect: (jest.fn() as any).mockImplementation(() => Promise.resolve()),
                close: (jest.fn() as any).mockImplementation(() => Promise.resolve()),
                _requestHandlers: new Map()
            } as any;

            await server.start();
            expect((server as any)._transportType).toBe('dual');

            // Test dual-mode message forwarding
            const httpTransport = (server as any)._httpTransport;
            const mockHandler = jest.fn().mockImplementation(() => Promise.resolve({ result: 'success' }));
            (server as any).mcpServer._requestHandlers = new Map([['test_method', mockHandler]]);

            const onMsg = (httpTransport as any).messageHandler;
            await onMsg({ jsonrpc: '2.0', id: 1, method: 'test_method' });

            expect(mockHandler).toHaveBeenCalled();

            await server.stop();
        });

        it('should handle dual-mode message forwarding errors', async () => {
            const server = new NitroStackServer({ name: 'DualErrorServer', version: '1' });
            process.env.MCP_TRANSPORT_TYPE = 'dual';
            process.env.PORT = '3130';
            (server as any).mcpServer = {
                connect: (jest.fn() as any).mockImplementation(() => Promise.resolve()),
                close: (jest.fn() as any).mockImplementation(() => Promise.resolve()),
                _requestHandlers: new Map([['fail_method', async () => { throw new Error('Forced failure'); }]])
            } as any;

            await server.start();
            const httpTransport = (server as any)._httpTransport;
            const sendSpy = jest.spyOn(httpTransport, 'send');

            const onMsg = (httpTransport as any).messageHandler;
            await onMsg({ jsonrpc: '2.0', id: 2, method: 'fail_method' });

            expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.objectContaining({ message: 'Forced failure' })
            }));

            await server.stop();
        });

        it('should start in explicit http mode', async () => {
            process.env.MCP_TRANSPORT_TYPE = 'http';
            process.env.PORT = '3126';
            process.env.NODE_ENV = 'production';

            const server = new NitroStackServer({ name: 'HttpServer', version: '1' });
            (server as any).mcpServer = {
                connect: (jest.fn() as any).mockImplementation(() => Promise.resolve()),
                close: (jest.fn() as any).mockImplementation(() => Promise.resolve())
            } as any;

            await server.start();
            expect((server as any)._transportType).toBe('http');

            await server.stop();
        });

        it('should handle start failure and log error', async () => {
            process.env.PORT = '3127';
            process.env.MCP_TRANSPORT_TYPE = 'http';
            const server = new NitroStackServer({ name: 'FailServer', version: '1' });
            (server as any).mcpServer = {
                connect: (jest.fn() as any).mockImplementation(() => Promise.reject(new Error('Connect failed'))),
                close: (jest.fn() as any).mockImplementation(() => Promise.resolve())
            } as any;

            const loggerSpy = jest.spyOn((server as any).logger, 'error');

            await expect(server.start()).rejects.toThrow('Connect failed');
            expect(loggerSpy).toHaveBeenCalledWith('Failed to start server', expect.any(Object));
        });
    });

    describe('Replay Logic & Error Paths', () => {
        it('should cover message replay logic in StreamableHttpTransport', async () => {
            const transport = new StreamableHttpTransport({ port: 3135, enableSessions: true });
            await transport.start();

            const sessionId = 'replay-session';
            const session = {
                id: sessionId,
                streams: new Map(),
                lastActivity: Date.now(),
                messageQueue: [{ event: 'message', data: { jsonrpc: '2.0', result: 'queued' }, id: 5 }],
                eventIdCounter: 5
            };
            (transport as any).sessions.set(sessionId, session);

            await (transport as any).replayMessages(session, 4);
            await transport.close();
        });

        it('should cover legacy message error path', async () => {
            const transport = new StreamableHttpTransport({ port: 3136 });
            await transport.start();

            transport.onmessage = (async () => { throw new Error('Legacy error'); }) as any;

            const res = await fetch('http://localhost:3136/mcp/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'test' })
            });
            expect(res.status).toBe(500);
            await transport.close();
        });
    });

    describe('Decorator Coverage (RateLimit & HealthCheck)', () => {
        it('should cover RateLimit decorator logic', async () => {
            const storage = new InMemoryRateLimitStorage();

            class TestTool {
                @RateLimit({ requests: 2, window: '1m', storage })
                async testMethod(input: any, context: any) {
                    return 'ok';
                }
            }

            const tool = new TestTool();
            const context = { logger: { info: jest.fn(), warn: jest.fn() }, auth: { subject: 'user1' } };

            expect(await tool.testMethod({}, context)).toBe('ok');
            expect(await tool.testMethod({}, context)).toBe('ok');
            await expect(tool.testMethod({}, context)).rejects.toThrow('Rate limit exceeded');

            storage.reset('TestTool:testMethod:user1');
            expect(await tool.testMethod({}, context)).toBe('ok');
        });

        it('should cover HealthCheck registry logic', async () => {
            const checker = { check: jest.fn().mockImplementation(() => Promise.resolve({ status: 'up' })) };
            registerHealthCheck(checker as any, { name: 'test-check' });

            const results = await getAllHealthChecks();
            expect(results['test-check']).toBeDefined();

            // Test getHealthCheck
            const single = await getHealthCheck('test-check');
            expect(single?.status).toBe('up');
            expect(await getHealthCheck('missing')).toBeNull();

            // Test getOverallHealth
            const overall = await getOverallHealth();
            expect(overall.status).toBe('healthy');

            // Register with interval
            jest.useFakeTimers();
            const checker2 = { check: jest.fn().mockImplementation(() => Promise.resolve({ status: 'up' })) };
            registerHealthCheck(checker2 as any, { name: 'interval-check', interval: 0.1 });

            await jest.advanceTimersByTimeAsync(200);
            const results2 = await getAllHealthChecks();
            expect(results2['interval-check'].timestamp).toBeDefined();
            jest.useRealTimers();
        });

        it('should cover HealthCheck failure paths', async () => {
            const checker = { check: jest.fn().mockImplementation(() => Promise.reject(new Error('Health fail'))) };
            registerHealthCheck(checker as any, { name: 'fail-check' });

            const results = await getAllHealthChecks();
            expect(results['fail-check'].status).toBe('down');

            const overall = await getOverallHealth();
            expect(overall.status).toBe('unhealthy');

            // Test getHealthCheck failure path
            const single = await getHealthCheck('fail-check');
            expect(single?.status).toBe('down');
        });
    });

    describe('RateLimit Edge Cases', () => {
        it('should cover resetRateLimit', async () => {
            await resetRateLimit('test-key');
        });
    });

    describe('Health Resource', () => {
        it('should cover health checks resource', async () => {
            const { buildHealthChecksResource } = await import('../health/health-checks.resource.js');
            const resource = await buildHealthChecksResource();
            const result = await resource.read();
            expect(JSON.parse(result).checks).toBeDefined();
        });
    });

    describe('RateLimit Edge Cases', () => {
        it('should cover invalid window format', () => {
            const storage = new InMemoryRateLimitStorage();
            expect(() => {
                class FailTool {
                    @RateLimit({ requests: 1, window: 'invalid', storage })
                    async fail() { }
                }
            }).toThrow('Invalid time window format');
        });
    });

    describe('Event System Coverage (EventEmitter & Decorators)', () => {
        it('should cover EventEmitter full API', async () => {
            const emitter = EventEmitter.getInstance();
            emitter.removeAllListeners();

            const handler1 = jest.fn();
            const handler2 = jest.fn();

            emitter.on('test-event', handler1 as any);
            emitter.once('test-event', handler2 as any);

            expect(emitter.listenerCount('test-event')).toBe(2);
            expect(emitter.eventNames()).toContain('test-event');

            await emitter.emit('test-event', 'data1');
            expect(handler1).toHaveBeenCalledWith('data1');
            expect(handler2).toHaveBeenCalledWith('data1');

            expect(emitter.listenerCount('test-event')).toBe(1); // once handler removed

            emitter.emitSync('test-event', 'data2');
            expect(handler1).toHaveBeenCalledWith('data2');

            emitter.off('test-event', handler1 as any);
            expect(emitter.listenerCount('test-event')).toBe(0);

            emitter.on('other', handler1 as any);
            emitter.removeAllListeners('other');
            expect(emitter.listenerCount('other')).toBe(0);
        });

        it('should cover OnEvent decorator and registerEventHandlers', async () => {
            const emitter = EventEmitter.getInstance();
            emitter.removeAllListeners();

            class EventSubscriber {
                @OnEvent('order.created')
                async onOrderCreated(order: any) {
                    this.lastOrder = order;
                }
                lastOrder: any;
            }

            const sub = new EventSubscriber();
            registerEventHandlers(sub as any);

            emitEvent('order.created', { id: 123 });

            // Wait for async background emit
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(sub.lastOrder.id).toBe(123);
        });
    });
});
