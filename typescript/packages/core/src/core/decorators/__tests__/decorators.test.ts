import { jest, describe, it, expect, afterEach } from '@jest/globals';
import 'reflect-metadata';
import { z } from 'zod';
import {
    Tool, Resource, Prompt, Widget, Controller,
    extractTools, extractResources, extractPrompts, getWidgetMetadata, getControllerPrefix
} from '../../decorators';
import { buildTools } from '../../builders';
import { DIContainer } from '../../di/container';
import { OnEvent, getEventHandlers } from '../../events/event.decorator';
import { Inject, getInjectTokens } from '../../di/injectable.decorator';
import { Body, getParamPipesMetadata } from '../../pipes/pipe.decorator';

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

describe('@Controller', () => {
    afterEach(() => {
        DIContainer.getInstance().clear();
    });

    it('should auto-register the class in the DI container', () => {
        @Controller()
        class BareController {
            @Tool({ name: 'noop', description: 'd', inputSchema: z.string() })
            noop() { }
        }

        expect(DIContainer.getInstance().has(BareController)).toBe(true);
    });

    it('should expose the prefix via getControllerPrefix (string form)', () => {
        @Controller('github')
        class GitHubController {
            @Tool({ name: 'create_issue', description: 'd', inputSchema: z.string() })
            createIssue() { }
        }

        expect(getControllerPrefix(GitHubController)).toBe('github');
    });

    it('should expose the prefix via getControllerPrefix (options form)', () => {
        @Controller({ prefix: 'slack' })
        class SlackController {
            @Tool({ name: 'send', description: 'd', inputSchema: z.string() })
            send() { }
        }

        expect(getControllerPrefix(SlackController)).toBe('slack');
    });

    it('should return undefined when no prefix is set', () => {
        @Controller()
        class NoPrefixController {
            @Tool({ name: 'x', description: 'd', inputSchema: z.string() })
            x() { }
        }

        expect(getControllerPrefix(NoPrefixController)).toBeUndefined();
    });

    it('should prefix tool names when building tools', () => {
        @Controller('github')
        class GitHubController {
            @Tool({ name: 'create_issue', description: 'd', inputSchema: z.string() })
            createIssue() { }
        }

        const tools = buildTools(new GitHubController() as any);
        expect(tools.map(t => t.name)).toEqual(['github_create_issue']);
    });

    it('should not double-prefix a tool name that already starts with the prefix', () => {
        @Controller('github')
        class GitHubController {
            @Tool({ name: 'github_create_issue', description: 'd', inputSchema: z.string() })
            createIssue() { }
        }

        const tools = buildTools(new GitHubController() as any);
        expect(tools.map(t => t.name)).toEqual(['github_create_issue']);
    });

    it('should not mutate the stored tool metadata when prefixing', () => {
        @Controller('github')
        class GitHubController {
            @Tool({ name: 'create_issue', description: 'd', inputSchema: z.string() })
            createIssue() { }
        }

        buildTools(new GitHubController() as any);
        // The original metadata should remain unprefixed so repeated builds are stable.
        expect(extractTools(GitHubController)[0].options.name).toBe('create_issue');
        const secondBuild = buildTools(new GitHubController() as any);
        expect(secondBuild.map(t => t.name)).toEqual(['github_create_issue']);
    });

    it('should leave tool names untouched when no prefix is set', () => {
        @Controller()
        class PlainController {
            @Tool({ name: 'do_thing', description: 'd', inputSchema: z.string() })
            doThing() { }
        }

        const tools = buildTools(new PlainController() as any);
        expect(tools.map(t => t.name)).toEqual(['do_thing']);
    });
});

describe('Class Inheritance - metadata pollution', () => {
    afterEach(() => {
        DIContainer.getInstance().clear();
    });

    it('should not pollute parent @Tool metadata when subclassing', () => {
        class Parent {
            @Tool({ name: 'parent_tool', description: 'd', inputSchema: z.string() })
            parentMethod() { }
        }

        class Child extends Parent {
            @Tool({ name: 'child_tool', description: 'd', inputSchema: z.string() })
            childMethod() { }
        }

        expect(extractTools(Parent).map(t => t.options.name)).toEqual(['parent_tool']);
        expect(extractTools(Child).map(t => t.options.name)).toEqual(['parent_tool', 'child_tool']);
    });

    it('should not pollute parent @Resource metadata when subclassing', () => {
        class Parent {
            @Resource({ uri: 'p://res', name: 'parent_res', description: 'd' })
            parentRes() { }
        }

        class Child extends Parent {
            @Resource({ uri: 'c://res', name: 'child_res', description: 'd' })
            childRes() { }
        }

        expect(extractResources(Parent).map(r => r.options.name)).toEqual(['parent_res']);
        expect(extractResources(Child).map(r => r.options.name)).toEqual(['parent_res', 'child_res']);
    });

    it('should not pollute parent @Prompt metadata when subclassing', () => {
        class Parent {
            @Prompt({ name: 'parent_prompt', description: 'd' })
            parentPrompt() { }
        }

        class Child extends Parent {
            @Prompt({ name: 'child_prompt', description: 'd' })
            childPrompt() { }
        }

        expect(extractPrompts(Parent).map(p => p.options.name)).toEqual(['parent_prompt']);
        expect(extractPrompts(Child).map(p => p.options.name)).toEqual(['parent_prompt', 'child_prompt']);
    });

    it('should not pollute parent @OnEvent metadata when subclassing', () => {
        class Parent {
            @OnEvent('parent.event')
            onParent() { }
        }

        class Child extends Parent {
            @OnEvent('child.event')
            onChild() { }
        }

        expect(getEventHandlers(Parent).map(h => h.event)).toEqual(['parent.event']);
        expect(getEventHandlers(Child).map(h => h.event)).toEqual(['parent.event', 'child.event']);
    });

    it('should not pollute parent @Inject metadata when subclassing', () => {
        class Parent {
            constructor(@Inject('PARENT_TOKEN') public parentDep: unknown) { }
        }

        class Child extends Parent {
            constructor(@Inject('CHILD_TOKEN') public childDep: unknown) {
                super(childDep);
            }
        }

        expect(getInjectTokens(Parent)).toEqual(['PARENT_TOKEN']);
        expect(getInjectTokens(Child)[0]).toBe('CHILD_TOKEN');
    });

    it('should not pollute parent @Body metadata when a subclass overrides a method', () => {
        class Parent {
            @Tool({ name: 'p', description: 'd', inputSchema: z.string() })
            handle(@Body() _input: unknown, _extra: unknown) { }
        }

        class Child extends Parent {
            // Overrides the same method name; @Body keys metadata on
            // (prototype, propertyKey) and getMetadata walks the prototype chain,
            // so without cloning the child would mutate the parent's param object.
            @Tool({ name: 'c', description: 'd', inputSchema: z.string() })
            handle(@Body() _second: unknown, @Body() _third: unknown) { }
        }

        expect(Object.keys(getParamPipesMetadata(Parent.prototype, 'handle'))).toHaveLength(1);
        expect(Object.keys(getParamPipesMetadata(Child.prototype, 'handle')).length).toBeGreaterThan(1);
    });
});
