import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import 'reflect-metadata';

const { DIContainer } = await import('../di/container.js');

describe('DIContainer', () => {
    let container: any;

    beforeEach(() => {
        container = DIContainer.getInstance();
        container.clear();
    });

    it('should be a singleton', () => {
        const c1 = DIContainer.getInstance();
        const c2 = DIContainer.getInstance();
        expect(c1).toBe(c2);
    });

    it('should register and has tokens', () => {
        class TestService { }
        container.register(TestService);
        expect(container.has(TestService)).toBe(true);
        expect(container.has('other')).toBe(false);
    });

    it('should register and resolve values', () => {
        const token = 'CONFIG';
        const value = { api: 'ok' };
        container.registerValue(token, value);
        expect(container.resolve(token)).toBe(value);
    });

    it('should resolve class with no dependencies', () => {
        class SimpleService { }
        const instance = container.resolve(SimpleService);
        expect(instance).toBeInstanceOf(SimpleService);
        // Should be singleton by default
        const instance2 = container.resolve(SimpleService);
        expect(instance2).toBe(instance);
    });

    it('should resolve class with dependencies via reflect-metadata', () => {
        class DepService { }
        class ParentService {
            constructor(public dep: DepService) { }
        }

        // Manually set metadata as if TypeScript did it
        Reflect.defineMetadata('design:paramtypes', [DepService], ParentService);

        const parent = container.resolve(ParentService);
        expect(parent).toBeInstanceOf(ParentService);
        expect(parent.dep).toBeInstanceOf(DepService);
    });

    it('should resolve class with explicit @Inject tokens', () => {
        class DepService { }
        class ParentService {
            constructor(public dep: any) { }
        }

        // Mock @Inject behavior
        Reflect.defineMetadata('design:paramtypes', [Object], ParentService);
        Reflect.defineMetadata('nitrostack:inject', [DepService], ParentService);

        const parent = container.resolve(ParentService);
        expect(parent).toBeInstanceOf(ParentService);
        expect(parent.dep).toBeInstanceOf(DepService);
    });

    it('should throw error for unregistered string tokens with no provider', () => {
        expect(() => container.resolve('UNREGISTERED')).toThrow('No value or provider registered');
    });

    it('should use custom provider class for a token', () => {
        class Base { }
        class Extended extends Base { }
        container.register(Base, Extended);

        const instance = container.resolve(Base);
        expect(instance).toBeInstanceOf(Extended);
    });

    it('should handle recursive deep dependencies', () => {
        class Level3 { }
        class Level2 { constructor(public l3: Level3) { } }
        class Level1 { constructor(public l2: Level2) { } }

        Reflect.defineMetadata('design:paramtypes', [Level3], Level2);
        Reflect.defineMetadata('design:paramtypes', [Level2], Level1);

        const l1 = container.resolve(Level1);
        expect(l1.l2.l3).toBeInstanceOf(Level3);
    });
});
