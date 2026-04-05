import { jest, describe, it, expect } from '@jest/globals';
import 'reflect-metadata';
import { z } from 'zod';
import {
    Tool, Resource, Prompt, Widget,
    extractTools, extractResources, extractPrompts, getWidgetMetadata
} from '../../decorators';

describe('Core Decorators', () => {
    describe('@Tool', () => {
        it('should register tool metadata', () => {
            const schema = z.object({ foo: z.string() });

            class TestController {
                @Tool({ name: 'test-tool', description: 'desc', inputSchema: schema })
                testMethod() { }
            }

            const tools = extractTools(TestController);
            expect(tools).toHaveLength(1);
            expect(tools[0].methodName).toBe('testMethod');
            expect(tools[0].options.name).toBe('test-tool');
            expect(tools[0].options.inputSchema).toBe(schema);
        });

        it('should register multiple tools', () => {
            class TestController {
                @Tool({ name: 'tool1', description: 'd1', inputSchema: z.string() })
                method1() { }

                @Tool({ name: 'tool2', description: 'd2', inputSchema: z.string() })
                method2() { }
            }

            const tools = extractTools(TestController);
            expect(tools).toHaveLength(2);
        });
    });

    describe('@Resource', () => {
        it('should register resource metadata', () => {
            class TestController {
                @Resource({ uri: 'test://uri', name: 'res', description: 'desc' })
                testResource() { }
            }

            const resources = extractResources(TestController);
            expect(resources).toHaveLength(1);
            expect(resources[0].options.uri).toBe('test://uri');
        });
    });

    describe('@Prompt', () => {
        it('should register prompt metadata', () => {
            class TestController {
                @Prompt({ name: 'test-prompt', description: 'desc' })
                testPrompt() { }
            }

            const prompts = extractPrompts(TestController);
            expect(prompts).toHaveLength(1);
            expect(prompts[0].options.name).toBe('test-prompt');
        });
    });

    describe('@Widget', () => {
        it('should register widget metadata', () => {
            class TestController {
                @Tool({ name: 't', description: 'd', inputSchema: z.string() })
                @Widget('test-route')
                method() { }
            }

            const meta = getWidgetMetadata(new TestController(), 'method');
            expect(meta?.route).toBe('test-route');
        });

        it('should store CSP when using object form', () => {
            class TestController {
                @Tool({ name: 't', description: 'd', inputSchema: z.string() })
                @Widget({
                    route: 'r1',
                    csp: { resourceDomains: ['https://images.unsplash.com'] },
                })
                method() { }
            }

            const meta = getWidgetMetadata(new TestController(), 'method');
            expect(meta?.route).toBe('r1');
            expect(meta?.csp?.resourceDomains).toEqual(['https://images.unsplash.com']);
        });

        it('should store domain, prefersBorder, and frameDomains', () => {
            class TestController {
                @Tool({ name: 't', description: 'd', inputSchema: z.string() })
                @Widget({
                    route: 'x',
                    prefersBorder: true,
                    domain: 'https://example.com',
                    csp: {
                        connectDomains: ['https://api.example.com'],
                        frameDomains: ['https://embed.example.com'],
                    },
                })
                method() { }
            }

            const meta = getWidgetMetadata(new TestController(), 'method');
            expect(meta?.prefersBorder).toBe(true);
            expect(meta?.domain).toBe('https://example.com');
            expect(meta?.csp?.connectDomains).toEqual(['https://api.example.com']);
            expect(meta?.csp?.frameDomains).toEqual(['https://embed.example.com']);
        });

        it('should throw when object form has no route', () => {
            expect(() => {
                class Bad {
                    @Tool({ name: 't', description: 'd', inputSchema: z.string() })
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    @Widget({} as any)
                    method() { }
                }
                return Bad;
            }).toThrow(/requires a non-empty string "route"/);
        });

        it('should throw when route is whitespace only', () => {
            expect(() => {
                class Bad {
                    @Tool({ name: 't', description: 'd', inputSchema: z.string() })
                    @Widget({ route: '   ' })
                    method() { }
                }
                return Bad;
            }).toThrow(/requires a non-empty string "route"/);
        });
    });
});
