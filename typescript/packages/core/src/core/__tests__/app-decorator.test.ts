import { describe, it, expect } from '@jest/globals';
import 'reflect-metadata';
import { McpApp, getMcpAppMetadata, McpAppOptions } from '../app-decorator.js';
import { Module } from '../module.js';

describe('App Decorator', () => {
    describe('@McpApp decorator', () => {
        it('should mark class with metadata', () => {
            @Module({ name: 'test' })
            class TestModule { }

            @McpApp({ module: TestModule })
            class TestApp { }

            const metadata = getMcpAppMetadata(TestApp);
            expect(metadata).toBeDefined();
            expect(metadata?.module).toBe(TestModule);
        });

        it('should store server options', () => {
            @Module({ name: 'test' })
            class TestModule { }

            @McpApp({
                module: TestModule,
                server: {
                    name: 'test-server',
                    version: '1.2.3'
                }
            })
            class TestApp { }

            const metadata = getMcpAppMetadata(TestApp);
            expect(metadata?.server?.name).toBe('test-server');
            expect(metadata?.server?.version).toBe('1.2.3');
        });

        it('should store logging options', () => {
            @Module({ name: 'test' })
            class TestModule { }

            @McpApp({
                module: TestModule,
                logging: { level: 'debug' }
            })
            class TestApp { }

            const metadata = getMcpAppMetadata(TestApp);
            expect(metadata?.logging?.level).toBe('debug');
        });

        it('should store transport options', () => {
            @Module({ name: 'test' })
            class TestModule { }

            @McpApp({
                module: TestModule,
                transport: {
                    type: 'http',
                    http: {
                        port: 3000,
                        host: '0.0.0.0',
                        basePath: '/api'
                    }
                }
            })
            class TestApp { }

            const metadata = getMcpAppMetadata(TestApp);
            expect(metadata?.transport?.type).toBe('http');
            expect(metadata?.transport?.http?.port).toBe(3000);
        });
    });

    describe('getMcpAppMetadata', () => {
        it('should return undefined for non-decorated classes', () => {
            class RegularClass { }
            expect(getMcpAppMetadata(RegularClass)).toBeUndefined();
        });
    });
});
