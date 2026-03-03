import { jest, describe, it, expect } from '@jest/globals';
import 'reflect-metadata';
import {
    Middleware,
    UseMiddleware,
    getMiddlewareMetadata,
    isMiddleware
} from '../middleware.decorator.js';
import { MiddlewareInterface } from '../middleware.interface.js';

describe('Core Middleware', () => {
    describe('@Middleware Decorator', () => {
        it('should mark class as middleware', () => {
            @Middleware()
            class TestMiddleware implements MiddlewareInterface {
                async use(ctx: any, next: any) { return next(); }
            }

            expect(isMiddleware(TestMiddleware)).toBe(true);
        });

        it('should return false for non-middleware class', () => {
            class NormalClass { }
            expect(isMiddleware(NormalClass)).toBe(false);
        });
    });

    describe('@UseMiddleware Decorator', () => {
        it('should register middleware metadata on method', () => {
            class TestMiddleware { }

            class TestClass {
                @UseMiddleware(TestMiddleware as any)
                testMethod() { }
            }

            const instance = new TestClass();
            const metadata = getMiddlewareMetadata(instance, 'testMethod');

            expect(metadata).toHaveLength(1);
            expect(metadata[0]).toBe(TestMiddleware);
        });

        it('should stack multiple middlewares', () => {
            class Middleware1 { }
            class Middleware2 { }

            class TestClass {
                @UseMiddleware(Middleware1 as any)
                @UseMiddleware(Middleware2 as any)
                testMethod() { }
            }

            const instance = new TestClass();
            const metadata = getMiddlewareMetadata(instance, 'testMethod');

            // Decorators apply inside-out (bottom-up), so Middleware2 comes first, then Middleware1
            // But usually we want execution order. Let's check how implementation handles it.
            // based on the implementation: [...existing, ...new]. 
            // 1. @UseMiddleware(Middleware2) runs -> metadata = [Middleware2]
            // 2. @UseMiddleware(Middleware1) runs -> existing=[Middleware2], new=[Middleware1] -> result=[Middleware2, Middleware1]
            // Wait, looking at implementation:
            // const existingMiddlewares = Reflect.getMetadata(...) || [];
            // Reflect.defineMetadata(..., [...existingMiddlewares, ...middlewares], ...);

            // So if I use:
            // @A
            // @B
            // method()
            // B runs first. sets [B].
            // A runs second. gets [B]. sets [B, A].

            expect(metadata).toHaveLength(2);
            expect(metadata[0]).toBe(Middleware2);
            expect(metadata[1]).toBe(Middleware1);
        });

        it('should accept multiple middlewares in single decorator', () => {
            class Middleware1 { }
            class Middleware2 { }

            class TestClass {
                @UseMiddleware(Middleware1 as any, Middleware2 as any)
                testMethod() { }
            }

            const instance = new TestClass();
            const metadata = getMiddlewareMetadata(instance, 'testMethod');

            expect(metadata).toHaveLength(2);
            expect(metadata[0]).toBe(Middleware1);
            expect(metadata[1]).toBe(Middleware2);
        });
    });
});
