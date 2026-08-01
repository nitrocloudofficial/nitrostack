import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import 'reflect-metadata';
import { DIContainer } from '../container';

describe('DIContainer', () => {
    let container: DIContainer;

    beforeEach(() => {
        container = DIContainer.getInstance();
        container.clear();
    });

    afterEach(() => {
        container.clear();
    });

    it('should be a singleton', () => {
        const instance1 = DIContainer.getInstance();
        const instance2 = DIContainer.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should register and resolve a class provider', () => {
        class TestService {
            getValue() { return 'test'; }
        }

        container.register(TestService);
        const instance = container.resolve(TestService);

        expect(instance).toBeInstanceOf(TestService);
        expect(instance.getValue()).toBe('test');
    });

    it('should return the same instance for singleton scope', () => {
        class TestService { }

        container.register(TestService);
        const instance1 = container.resolve(TestService);
        const instance2 = container.resolve(TestService);

        expect(instance1).toBe(instance2);
    });

    it('should register and resolve a value provider', () => {
        const token = 'CONFIG';
        const value = { apiKey: '123' };

        container.registerValue(token, value);
        const resolved = container.resolve(token);

        expect(resolved).toBe(value);
    });

    it('should resolve dependencies recursively', () => {
        class DepService {
            getName() { return 'dep'; }
        }

        // We need to simulate metadata decoration or manually register generic class dependency
        // Since we can't easily mock Reflect.metadata in the test without the decorator,
        // we can assume the container works if we verify basic registration.
        // However, for true integration, let's use a mock decorator approach or manual setup.

        // Simulating @Injectable() behavior manually for the test environment
        const Injectable = (): ClassDecorator => {
            return (target) => { };
        };

        @Injectable()
        class ParentService {
            constructor(public dep: DepService) { }
        }

        // Polyfill metadata for the test
        Reflect.defineMetadata('design:paramtypes', [DepService], ParentService);

        container.register(DepService);
        container.register(ParentService);

        const parent = container.resolve(ParentService);
        expect(parent).toBeInstanceOf(ParentService);
        expect(parent.dep).toBeInstanceOf(DepService);
        expect(parent.dep.getName()).toBe('dep');
    });

    it('should throw error when resolving unregistered token', () => {
        expect(() => {
            container.resolve('UNREGISTERED');
        }).toThrow(/Cannot resolve token/);
    });
});
