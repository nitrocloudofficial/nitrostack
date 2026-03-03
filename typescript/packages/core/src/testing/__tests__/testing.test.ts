import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MockLogger, TestingModule, createMockContext, createMockFn, spyOn, flushPromises } from '../index.js';
import { DIContainer } from '../../core/di/container.js';

describe('Testing Utilities', () => {
    describe('MockLogger', () => {
        it('should store logs', () => {
            const logger = new MockLogger();
            logger.info('test info');
            logger.error('test error');

            expect(logger.logs).toHaveLength(2);
            expect(logger.hasLog('info', 'test info')).toBe(true);
        });

        it('should clear logs', () => {
            const logger = new MockLogger();
            logger.info('test');
            logger.clear();
            expect(logger.logs).toHaveLength(0);
        });

        it('should log debug messages with meta', () => {
            const logger = new MockLogger();
            logger.debug('debug message', { key: 'value' });

            expect(logger.logs[0]).toEqual({
                level: 'debug',
                message: 'debug message',
                meta: { key: 'value' }
            });
        });

        it('should log warn messages', () => {
            const logger = new MockLogger();
            logger.warn('warning');

            expect(logger.logs[0].level).toBe('warn');
        });

        it('should return false for non-existent logs', () => {
            const logger = new MockLogger();
            logger.info('something');

            expect(logger.hasLog('error', 'something')).toBe(false);
            expect(logger.hasLog('info', 'other')).toBe(false);
        });
    });

    describe('createMockContext', () => {
        it('should create a default mock context', () => {
            const context = createMockContext();

            expect(context.requestId).toBe('test-request-id');
            expect(context.logger).toBeInstanceOf(MockLogger);
            expect(context.metadata).toEqual({});
            expect(context.auth).toBeUndefined();
        });

        it('should allow overrides', () => {
            const context = createMockContext({
                requestId: 'custom-id',
                metadata: { custom: 'value' }
            });

            expect(context.requestId).toBe('custom-id');
            expect(context.metadata).toEqual({ custom: 'value' });
        });
    });

    describe('TestingModule', () => {
        beforeEach(() => {
            DIContainer.getInstance().clear();
        });

        it('should create and compile', () => {
            const module = TestingModule.create();
            const compiled = module.compile();
            expect(compiled).toBeDefined();
            compiled.cleanup();
        });

        it('should register mocks', () => {
            class TestService { }
            const mockService = { foo: 'bar' };

            const module = TestingModule.create()
                .addMock(TestService, mockService);

            const compiled = module.compile();
            const instance = compiled.get(TestService);

            expect(instance).toBe(mockService);
            compiled.cleanup();
        });

        it('should register and resolve providers', () => {
            class SimpleService {
                getValue() { return 'real'; }
            }

            const compiled = TestingModule.create()
                .addProvider(SimpleService)
                .compile();

            const service = compiled.get(SimpleService);
            expect(service).toBeInstanceOf(SimpleService);
            expect(service.getValue()).toBe('real');

            compiled.cleanup();
        });

        it('should prefer mocks over providers', () => {
            class TestService {
                getValue() { return 'real'; }
            }

            const mockService = {
                getValue: () => 'mocked'
            };

            const compiled = TestingModule.create()
                .addProvider(TestService)
                .addMock(TestService, mockService)
                .compile();

            const service = compiled.get(TestService);
            expect(service.getValue()).toBe('mocked');

            compiled.cleanup();
        });
    });

    describe('createMockFn', () => {
        it('should create a mock function', () => {
            const mockFn = createMockFn();
            expect(typeof mockFn).toBe('function');
        });

        it('should track calls', () => {
            const mockFn = createMockFn();
            mockFn('arg1', 'arg2');
            mockFn('arg3');

            expect(mockFn.calls).toHaveLength(2);
            expect(mockFn.calls[0]).toEqual(['arg1', 'arg2']);
            expect(mockFn.calls[1]).toEqual(['arg3']);
        });

        it('should return mock value', () => {
            const mockFn = createMockFn<[], string>();
            mockFn.mockReturnValue = 'mocked result';

            expect(mockFn()).toBe('mocked result');
        });

        it('should support mockResolvedValue', async () => {
            const mockFn = createMockFn();
            mockFn.mockResolvedValue('resolved');

            await expect(mockFn()).resolves.toBe('resolved');
        });

        it('should support mockRejectedValue', async () => {
            const mockFn = createMockFn();
            mockFn.mockRejectedValue(new Error('rejected'));

            await expect(mockFn()).rejects.toThrow('rejected');
        });
    });

    describe('spyOn', () => {
        it('should spy on object methods', () => {
            const obj = {
                method: (x: number) => x * 2
            };

            const spy = spyOn(obj, 'method');

            obj.method(5);
            obj.method(10);

            expect(spy.calls).toHaveLength(2);
            expect(spy.calls[0]).toEqual([5]);
            expect(spy.calls[1]).toEqual([10]);

            spy.restore();
        });

        it('should restore original method', () => {
            const obj = {
                method: (x: number) => x * 2
            };

            const originalMethod = obj.method;
            const spy = spyOn(obj, 'method');

            spy.restore();

            expect(obj.method).toBe(originalMethod);
        });
    });

    describe('flushPromises', () => {
        it('should flush pending promises', async () => {
            let resolved = false;
            Promise.resolve().then(() => { resolved = true; });

            await flushPromises();

            expect(resolved).toBe(true);
        });
    });
});
