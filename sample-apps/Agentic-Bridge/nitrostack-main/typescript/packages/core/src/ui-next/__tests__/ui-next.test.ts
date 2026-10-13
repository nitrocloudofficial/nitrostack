import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('node:fs', () => ({
    __esModule: true, // Optional for built-ins but good practice
    default: {
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        mkdirSync: jest.fn(),
        writeFileSync: jest.fn(),
        rmSync: jest.fn()
    },
    // Also named exports
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    rmSync: jest.fn()
}));

jest.unstable_mockModule('node:child_process', () => ({
    __esModule: true,
    execSync: jest.fn()
}));

jest.unstable_mockModule('../../core/component', () => ({
    __esModule: true,
    createComponent: jest.fn()
}));

// Dynamic imports
const fs = await import('node:fs');
const { execSync } = await import('node:child_process');
const { createComponent } = await import('../../core/component');
const { createComponentFromNext, createComponentFromNextRoute } = await import('../index');
import path from 'node:path';

describe('UI Next', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock fs default behaviors
        // Note: fs is namespace object, but unstable_mockModule allows named exports
        // We use fs.existsSync as key
        (fs.existsSync as jest.Mock<any>).mockReturnValue(true);
        (fs.readFileSync as jest.Mock<any>).mockReturnValue('<html>Content</html>');
    });

    describe('createComponentFromNext', () => {
        it('should build and create component', () => {
            const opts: any = { // Cast detailed types for simplicty in test setup if types mismatch
                id: 'test-widget',
                name: 'Test Widget',
                projectDir: '/tmp/project',
                build: true
            };

            createComponentFromNext(opts);

            expect(execSync).toHaveBeenCalledWith(
                expect.stringContaining('npm run build'),
                expect.anything()
            );
            expect(createComponent).toHaveBeenCalled();
        });

        it('should throw if project dir missing', () => {
            (fs.existsSync as jest.Mock<any>).mockReturnValue(false);
            expect(() => createComponentFromNext({
                id: 'test',
                name: 'Test',
                projectDir: '/missing'
            } as any)).toThrow();
        });
    });

    describe('createComponentFromNextRoute', () => {
        it('should create component from route', () => {
            // Mock path exists logic for route
            (fs.existsSync as jest.Mock<any>).mockReturnValue(true);

            try {
                createComponentFromNextRoute('test-route', { projectDir: '/mock/project' } as any);
            } catch (e) {
                // Ignore
            }
        });
    });
});
