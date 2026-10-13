import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import 'reflect-metadata';
import { Tool } from '../tool';
import { Resource } from '../resource';
import { Component } from '../component';
import { createMockContext } from '../../testing';
import { z } from 'zod';
import { Guard } from '../guards/guard.interface';
import { MiddlewareInterface } from '../middleware/middleware.interface';
import { InterceptorInterface } from '../interceptors/interceptor.interface';
import { PipeInterface } from '../pipes/pipe.interface';
import { ExceptionFilterInterface } from '../filters/exception-filter.interface';

describe('Core Models', () => {
    describe('Tool', () => {
        let context: any;

        beforeEach(() => {
            context = createMockContext();
        });

        it('should execute handler', async () => {
            const handler = (jest.fn() as any).mockResolvedValue('success');
            const tool = new Tool({
                name: 'test',
                description: 'test',
                inputSchema: z.object({}),
                handler
            });

            const result = await tool.execute({}, context);
            expect(result).toBe('success');
            expect(handler).toHaveBeenCalled();
        });

        it('should execute guards', async () => {
            const canActivate = jest.fn().mockReturnValue(true) as any;
            class TestGuard implements Guard { canActivate = canActivate }

            const tool = new Tool({
                name: 'test',
                description: 'test',
                inputSchema: z.object({}),
                handler: async () => 'ok',
                guards: [TestGuard]
            });

            await tool.execute({}, context);
            expect(canActivate).toHaveBeenCalled();
        });

        it('should block if guard returns false', async () => {
            class BlockGuard implements Guard { canActivate() { return false; } }
            const tool = new Tool({
                name: 'test',
                description: 'test',
                inputSchema: z.object({}),
                handler: async () => 'ok',
                guards: [BlockGuard]
            });

            await expect(tool.execute({}, context)).rejects.toThrow('Access denied');
        });

        it('should execute middleware', async () => {
            const use = jest.fn().mockImplementation((ctx: any, next: any) => next()) as any;
            class TestMiddleware implements MiddlewareInterface { use = use }

            const tool = new Tool({
                name: 'test',
                description: 'test',
                inputSchema: z.object({}),
                handler: async () => 'ok',
                middlewares: [TestMiddleware]
            });

            await tool.execute({}, context);
            expect(use).toHaveBeenCalled();
        });

        it('should execute interceptors', async () => {
            const intercept = jest.fn().mockImplementation((ctx: any, next: any) => next()) as any;
            class TestInterceptor implements InterceptorInterface { intercept = intercept }

            const tool = new Tool({
                name: 'test',
                description: 'test',
                inputSchema: z.object({}),
                handler: async () => 'ok',
                interceptors: [TestInterceptor]
            });

            await tool.execute({}, context);
            expect(intercept).toHaveBeenCalled();
        });

        it('should execute pipes', async () => {
            const transform = jest.fn().mockImplementation((val: any) => val);
            class TestPipe implements PipeInterface { transform = transform }

            const tool = new Tool({
                name: 'test',
                description: 'test',
                inputSchema: z.object({}),
                handler: async () => 'ok',
                pipes: [TestPipe]
            });

            await tool.execute({}, context);
            expect(transform).toHaveBeenCalled();
        });

        it('should execute filters on error', async () => {
            class TestFilter implements ExceptionFilterInterface {
                catch(exception: unknown, host: any) { return 'handled'; }
            }

            const tool = new Tool({
                name: 'test',
                description: 'test',
                inputSchema: z.object({}),
                handler: async () => { throw new Error('fail'); },
                filters: [TestFilter]
            });

            const result = await tool.execute({}, context);
            expect(result).toBe('handled');
        });
    });

    describe('Resource', () => {
        it('should fetch content', async () => {
            const handler = (jest.fn() as any).mockResolvedValue({ text: 'content' });
            const resource = new Resource({
                uri: 'test://uri',
                name: 'test',
                description: 'test',
                mimeType: 'text/plain',
                handler
            });

            const context = createMockContext();
            const result = await resource.fetch(context);
            expect(result).toEqual({ text: 'content' });
            expect(handler).toHaveBeenCalledWith('test://uri', context);
        });
    });

    describe('Component', () => {
        it('should compile simple component', async () => {
            const component = new Component({
                id: 'test',
                name: 'Test',
                html: '<div></div>'
            });

            await component.compile();
            expect(component.getBundle()).toContain('<div></div>');
        });
    });
});
