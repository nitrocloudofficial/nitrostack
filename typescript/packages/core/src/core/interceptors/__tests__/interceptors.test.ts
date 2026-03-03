import { jest, describe, it, expect } from '@jest/globals';
import 'reflect-metadata';
import { UseInterceptors, getInterceptorMetadata } from '../interceptor.decorator';
import { InterceptorInterface } from '../interceptor.interface';

describe('Interceptors Module', () => {
    describe('@UseInterceptors Decorator', () => {
        it('should register interceptors metadata', () => {
            class MockInterceptor implements InterceptorInterface {
                intercept(context: any, next: () => Promise<unknown>) { return next(); }
            }

            class TestController {
                @UseInterceptors(MockInterceptor)
                method() { }
            }

            const metadata = getInterceptorMetadata(TestController.prototype, 'method');
            expect(metadata).toEqual([MockInterceptor]);
        });

        it('should register multiple interceptors', () => {
            class Interceptor1 implements InterceptorInterface { intercept(c: any, n: any) { return n(); } }
            class Interceptor2 implements InterceptorInterface { intercept(c: any, n: any) { return n(); } }

            class TestController {
                @UseInterceptors(Interceptor1, Interceptor2)
                method() { }
            }

            const metadata = getInterceptorMetadata(TestController.prototype, 'method');
            expect(metadata).toEqual([Interceptor1, Interceptor2]);
        });
    });
});
