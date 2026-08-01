import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockReadFileSync = jest.fn();
const mockExistsSync = jest.fn();
const mockConsoleError = jest.fn();

jest.unstable_mockModule('fs', () => ({
    readFileSync: mockReadFileSync,
    existsSync: mockExistsSync,
}));

// Mock console.error to keep test output clean
const originalConsoleError = console.error;
console.error = mockConsoleError;

const { WidgetRegistry, getWidgetRegistry } = await import('../widget-registry.js');

describe('WidgetRegistry', () => {
    let registry: any;

    beforeEach(() => {
        jest.clearAllMocks();
        registry = new WidgetRegistry();
    });

    afterAll(() => {
        console.error = originalConsoleError;
    });

    it('should handle missing manifest', () => {
        (mockExistsSync as any).mockReturnValue(false);
        registry.loadManifest('missing.json');
        expect(registry.isLoaded()).toBe(false);
        expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should load valid manifest', () => {
        const manifest = {
            version: '1.0',
            widgets: [
                { uri: 'widget:1', name: 'W1', description: 'D1', examples: [{ data: { a: 1 } }] }
            ]
        };
        (mockExistsSync as any).mockReturnValue(true);
        (mockReadFileSync as any).mockReturnValue(JSON.stringify(manifest));

        registry.loadManifest('valid.json');

        expect(registry.isLoaded()).toBe(true);
        expect(registry.getAllWidgets()).toHaveLength(1);
        expect(registry.getWidget('widget:1')).toBeDefined();
    });

    it('should handle malformed manifest', () => {
        (mockExistsSync as any).mockReturnValue(true);
        (mockReadFileSync as any).mockReturnValue('invalid-json');

        registry.loadManifest('bad.json');

        expect(registry.isLoaded()).toBe(false);
        expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should get widget example data', () => {
        const manifest = {
            widgets: [
                { uri: 'widget:1', examples: [{ data: { value: 123 } }] },
                { uri: 'widget:2', examples: [] }
            ]
        };
        (mockExistsSync as any).mockReturnValue(true);
        (mockReadFileSync as any).mockReturnValue(JSON.stringify(manifest));

        registry.loadManifest('valid.json');

        expect(registry.getWidgetExampleData('widget:1')).toEqual({ value: 123 });
        expect(registry.getWidgetExampleData('widget:2')).toBeUndefined();
        expect(registry.getWidgetExampleData('missing')).toBeUndefined();
    });

    it('should get singleton instance', () => {
        const instance1 = getWidgetRegistry();
        const instance2 = getWidgetRegistry();
        expect(instance1).toBe(instance2);
    });
});
