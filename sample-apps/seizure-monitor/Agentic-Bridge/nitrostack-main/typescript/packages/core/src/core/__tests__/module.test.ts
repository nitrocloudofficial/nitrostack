import { describe, it, expect } from '@jest/globals';
import 'reflect-metadata';
import { Module, createModule, isModule, getModuleMetadata, MODULE_METADATA } from '../module.js';

describe('Module Decorator', () => {
    describe('@Module', () => {
        it('should mark class with metadata', () => {
            @Module({ name: 'test-module', description: 'desc' })
            class TestModule { }

            expect(isModule(TestModule)).toBe(true);
            const metadata = getModuleMetadata(TestModule);
            expect(metadata?.name).toBe('test-module');
            expect(metadata?.description).toBe('desc');
        });

        it('should attach getMetadata static method', () => {
            @Module({ name: 'test' })
            class TestModule { }

            const metadata = (TestModule as any).getMetadata();
            expect(metadata.name).toBe('test');
        });
    });

    describe('createModule', () => {
        it('should create ModuleClass instance', () => {
            @Module({ name: 'test', description: 'test-desc', controllers: [] })
            class TestModule { }

            const mod = createModule(TestModule);
            expect(mod.getName()).toBe('test');
            expect(mod.getDescription()).toBe('test-desc');
            expect(mod.getControllers()).toEqual([]);
        });

        it('should throw if class is not a module', () => {
            class RegularClass { }
            expect(() => createModule(RegularClass)).toThrow('is not decorated with @Module');
        });
    });

    describe('isModule', () => {
        it('should return false for non-modules', () => {
            expect(isModule(class { })).toBe(false);
        });
    });
});
