import { jest, describe, it, expect } from '@jest/globals';

// Mock fs and path
jest.unstable_mockModule('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
}));

jest.unstable_mockModule('path', () => ({
    resolve: (base: string, p: string) => `${base}/${p}`,
    join: (base: string, p: string) => `${base}/${p}`,
}));

const { Component, createComponent } = await import('../component');
const fs = await import('fs');

describe('Component', () => {
    it('should validate definition', () => {
        expect(() => new Component({ id: '', name: 'test', html: '<div></div>' })).toThrow('Component ID is required');
        expect(() => new Component({ id: 'test', name: '', html: '<div></div>' })).toThrow('Component name is required');
    });

    it('should have basic getters', () => {
        const comp = new Component({ id: 'c1', name: 'Name', description: 'Desc', html: 'h' });
        expect(comp.id).toBe('c1');
        expect(comp.name).toBe('Name');
        expect(comp.description).toBe('Desc');
    });

    describe('compile', () => {
        it('should use inline HTML/CSS/JS', async () => {
            const comp = new Component({
                id: 'inline',
                name: 'Inline',
                html: '<div></div>',
                css: 'div{color:red}',
                js: 'console.log(1)'
            });
            await comp.compile();
            const bundle = comp.getBundle();
            expect(bundle).toContain('<div></div>');
            expect(bundle).toContain('<style>div{color:red}</style>');
            expect(bundle).toContain('<script type="module">console.log(1)</script>');

            // Re-compiling should return early
            await comp.compile();
        });

        it('should load from static file if exists', async () => {
            (fs.existsSync as any).mockReturnValue(true);
            (fs.readFileSync as any).mockReturnValue('<html>FILE</html>');

            const comp = new Component({ id: 'f1', name: 'File', html: 'FALLBACK' });
            await comp.compile();
            expect(comp.getBundle()).toContain('<html>FILE</html>');
        });

        it('should handle next- prefix for static files', async () => {
            // First existsSync (exact match) returns false
            // Second existsSync (without next-) returns true
            (fs.existsSync as any)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);
            (fs.readFileSync as any).mockReturnValue('<html>NEXT</html>');

            const comp = new Component({ id: 'next-real', name: 'Next', html: 'FALLBACK' });
            await comp.compile();
            expect(comp.getBundle()).toContain('<html>NEXT</html>');
        });

        it('should fallback to inline if file reading fails', async () => {
            (fs.existsSync as any).mockReturnValue(true);
            (fs.readFileSync as any).mockImplementation(() => { throw new Error('fail'); });

            const comp = new Component({ id: 'fail', name: 'Fail', html: 'INLINE' });
            await comp.compile();
            expect(comp.getBundle()).toContain('INLINE');
        });

        it('should warn if no HTML and not in dev mode', async () => {
            (fs.existsSync as any).mockReturnValue(false);
            const comp = new Component({ id: 'empty', name: 'Empty' } as any);
            await comp.compile();
            expect(comp.getBundle()).toBe('');
        });

        it('should throw getBundle if not compiled', () => {
            const comp = new Component({ id: 'c1', name: 'c1', html: 'h' });
            expect(() => comp.getBundle()).toThrow('Component not compiled');
        });
    });

    describe('metadata and uris', () => {
        it('should return correct resource URI', () => {
            const normal = new Component({ id: 'n1', name: 'n1', html: 'h' });
            expect(normal.getResourceUri()).toBe('ui://widget/n1.html');

            const dev = new Component({
                id: 'd1', name: 'd1', html: 'h',
                _meta: { devMode: true, devUrl: 'http://localhost:3000' }
            });
            expect(dev.getResourceUri()).toBe('http://localhost:3000');
            expect(dev.isDevMode()).toBe(true);
            expect(dev.getDevUrl()).toBe('http://localhost:3000');
        });

        it('should generate provider metadata', () => {
            const comp = new Component({
                id: 'c1',
                name: 'c1',
                html: 'h',
                description: 'desc',
                canInvokeTools: true,
                prefersBorder: true,
                subdomain: 'sub',
                csp: { connectDomains: ['a.com'], resourceDomains: ['b.com'] },
                providerMetadata: { custom: 'val' }
            });

            const openai = comp.getProviderMetadata('openai');
            expect(openai['openai/outputTemplate']).toBeDefined();

            const anthropic = comp.getProviderMetadata('anthropic');
            expect(anthropic['anthropic/ui']).toBeDefined();

            const generic = comp.getProviderMetadata('generic');
            expect(generic['ui/template']).toBeDefined();
        });

        it('should generate resource metadata', () => {
            const comp = new Component({
                id: 'c1',
                name: 'c1',
                html: 'h',
                description: 'desc',
                prefersBorder: true,
                csp: { connectDomains: ['a.com'] }
            });
            const meta = comp.getResourceMetadata();
            expect(meta.mimeType).toBe('text/html');
            expect(meta['openai/widgetPrefersBorder']).toBe(true);
        });
    });

    describe('transformations', () => {
        it('should use transformer and metaTransformer', async () => {
            const comp = new Component({
                id: 't1',
                name: 't1',
                html: 'h',
                transformer: (d: any) => ({ ...d, x: 1 }),
                metaTransformer: (d: any) => ({ ...d, y: 2 })
            });

            const data = { val: 0 };
            const context = {} as any;

            expect((await comp.transformData(data, context) as any).x).toBe(1);
            expect((await comp.getWidgetMeta(data, context) as any).y).toBe(2);

            const simple = new Component({ id: 's1', name: 's1', html: 'h' });
            expect(await simple.transformData(data, context)).toEqual(data);
            expect(await simple.getWidgetMeta(data, context)).toBeNull();
        });

        it('should run initialize and onInit', async () => {
            const onInit = jest.fn() as any;
            const comp = new Component({ id: 'i1', name: 'i1', html: 'h', onInit });
            await comp.initialize({} as any);
            expect(onInit).toHaveBeenCalled();
        });
    });

    it('should helper function createComponent', () => {
        const comp = createComponent({ id: 'h1', name: 'h1', html: 'h' });
        expect(comp).toBeInstanceOf(Component);
    });
});
