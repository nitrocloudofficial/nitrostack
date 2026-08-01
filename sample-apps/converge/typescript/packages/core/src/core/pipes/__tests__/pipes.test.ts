import { jest, describe, it, expect } from '@jest/globals';
import 'reflect-metadata';
import { UsePipes, getPipeMetadata, Pipe, Body, Validated, getParamPipesMetadata, isPipe } from '../pipe.decorator.js';
import { PipeInterface } from '../pipe.interface.js';

describe('Pipes Module', () => {
    describe('@Pipe Decorator', () => {
        it('should mark a class as a pipe', () => {
            @Pipe()
            class TestPipe implements PipeInterface {
                transform(value: any) { return value; }
            }

            expect(isPipe(TestPipe)).toBe(true);
        });

        it('should return false for non-pipe classes', () => {
            class RegularClass { }

            expect(isPipe(RegularClass)).toBe(false);
        });
    });

    describe('@UsePipes Decorator', () => {
        it('should register pipes metadata', () => {
            class MockPipe implements PipeInterface {
                transform(value: any) { return value; }
            }

            class TestController {
                @UsePipes(MockPipe)
                method() { }
            }

            const metadata = getPipeMetadata(TestController.prototype, 'method');
            expect(metadata).toEqual([MockPipe]);
        });

        it('should register multiple pipes', () => {
            class Pipe1 implements PipeInterface { transform(v: any) { return v; } }
            class Pipe2 implements PipeInterface { transform(v: any) { return v; } }

            class TestController {
                @UsePipes(Pipe1, Pipe2)
                method() { }
            }

            const metadata = getPipeMetadata(TestController.prototype, 'method');
            expect(metadata).toEqual([Pipe1, Pipe2]);
        });

        it('should return empty array for methods without pipes', () => {
            class TestController {
                method() { }
            }

            const metadata = getPipeMetadata(TestController.prototype, 'method');
            expect(metadata).toEqual([]);
        });

        it('should accumulate pipes from multiple @UsePipes', () => {
            class Pipe1 implements PipeInterface { transform(v: any) { return v; } }
            class Pipe2 implements PipeInterface { transform(v: any) { return v; } }

            class TestController {
                @UsePipes(Pipe1)
                @UsePipes(Pipe2)
                method() { }
            }

            const metadata = getPipeMetadata(TestController.prototype, 'method');
            expect(metadata).toContain(Pipe1);
            expect(metadata).toContain(Pipe2);
        });
    });

    describe('@Body Decorator', () => {
        it('should register parameter pipe metadata', () => {
            class ValidationPipe implements PipeInterface { transform(v: any) { return v; } }

            class TestController {
                method(@Body(ValidationPipe) input: any) { }
            }

            const metadata = getParamPipesMetadata(TestController.prototype, 'method');
            expect(metadata[0]).toEqual({
                type: 'body',
                pipes: [ValidationPipe]
            });
        });

        it('should register multiple pipes for parameter', () => {
            class Pipe1 implements PipeInterface { transform(v: any) { return v; } }
            class Pipe2 implements PipeInterface { transform(v: any) { return v; } }

            class TestController {
                method(@Body(Pipe1, Pipe2) input: any) { }
            }

            const metadata = getParamPipesMetadata(TestController.prototype, 'method');
            expect(metadata[0].pipes).toEqual([Pipe1, Pipe2]);
        });

        it('should return empty object for methods without param pipes', () => {
            class TestController {
                method(input: any) { }
            }

            const metadata = getParamPipesMetadata(TestController.prototype, 'method');
            expect(metadata).toEqual({});
        });
    });

    describe('@Validated Decorator', () => {
        it('should register body type with empty pipes', () => {
            class TestController {
                method(@Validated() input: any) { }
            }

            const metadata = getParamPipesMetadata(TestController.prototype, 'method');
            expect(metadata[0]).toEqual({
                type: 'body',
                pipes: []
            });
        });
    });
});
