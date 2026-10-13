import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { z } from 'zod';
import 'reflect-metadata';
import { buildTool, buildResource, buildPrompt, buildController } from '../builders.js';
import { Tool } from '../tool.js';
import { Resource } from '../resource.js';
import { Prompt } from '../prompt.js';

describe('Builders', () => {
    describe('buildTool', () => {
        it('should build a tool from a method', () => {
            class TestController {
                execute() { return 'ok'; }
            }
            const instance = new TestController() as any;
            const tool = buildTool(instance, 'execute', {
                name: 'test-tool',
                description: 'desc',
                inputSchema: z.object({})
            });

            expect(tool).toBeInstanceOf(Tool);
            expect(tool.name).toBe('test-tool');
        });
    });

    describe('buildResource', () => {
        it('should build a resource from a method', () => {
            class TestController {
                async handle() { return { type: 'text' as const, data: 'hi' }; }
            }
            const instance = new TestController() as any;
            const resource = buildResource(instance, 'handle', {
                uri: 'test://uri',
                name: 'test-res',
                description: 'desc'
            });

            expect(resource).toBeInstanceOf(Resource);
            expect(resource.uri).toBe('test://uri');
        });
    });

    describe('buildPrompt', () => {
        it('should build a prompt from a method', () => {
            class TestController {
                async handle() { return [{ role: 'user' as const, content: 'hi' }]; }
            }
            const instance = new TestController() as any;
            const prompt = buildPrompt(instance, 'handle', {
                name: 'test-prompt',
                description: 'desc'
            });

            expect(prompt).toBeInstanceOf(Prompt);
            expect(prompt.name).toBe('test-prompt');
        });
    });

    describe('buildController', () => {
        it('should build all components from a decorated controller', async () => {
            const { Tool: ToolDec, Resource: ResDec, Prompt: PromptDec } = await import('../decorators.js');

            class TestController {
                @ToolDec({ name: 't1', description: 'd', inputSchema: z.object({}) })
                t1() { }

                @ResDec({ uri: 'r1', name: 'n', description: 'd' })
                r1() { }

                @PromptDec({ name: 'p1', description: 'd' })
                p1() { }
            }

            const result = buildController(TestController as any);
            expect(result.tools).toHaveLength(1);
            expect(result.resources).toHaveLength(1);
            expect(result.prompts).toHaveLength(1);
            expect(result.tools[0].name).toBe('t1');
            expect(result.resources[0].uri).toBe('r1');
            expect(result.prompts[0].name).toBe('p1');
        });
    });
});
