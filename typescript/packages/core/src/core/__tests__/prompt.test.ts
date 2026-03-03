import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Prompt, createPrompt } from '../prompt.js';
import { ValidationError } from '../errors.js';
import { ExecutionContext, PromptMessage } from '../types.js';

describe('Prompt', () => {
    const mockContext: ExecutionContext = {
        requestId: 'test-request',
        logger: {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        },
        metadata: {},
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Prompt class', () => {
        it('should create a prompt with name and description', () => {
            const prompt = new Prompt({
                name: 'greeting',
                description: 'A greeting prompt',
                handler: async () => [{ role: 'assistant', content: 'Hello' }]
            });

            expect(prompt.name).toBe('greeting');
            expect(prompt.description).toBe('A greeting prompt');
        });

        it('should return empty array for arguments if not defined', () => {
            const prompt = new Prompt({
                name: 'simple',
                description: 'Simple prompt',
                handler: async () => []
            });

            expect(prompt.arguments).toEqual([]);
        });

        it('should return arguments if defined', () => {
            const prompt = new Prompt({
                name: 'parameterized',
                description: 'Prompt with args',
                arguments: [
                    { name: 'name', description: 'User name', required: true },
                    { name: 'age', description: 'User age', required: false }
                ],
                handler: async () => []
            });

            expect(prompt.arguments).toHaveLength(2);
            expect(prompt.arguments[0].name).toBe('name');
        });

        it('should execute handler and return messages', async () => {
            const messages: PromptMessage[] = [
                { role: 'assistant', content: 'Hello, World!' }
            ];

            const prompt = new Prompt({
                name: 'test',
                description: 'Test prompt',
                handler: async () => messages
            });

            const result = await prompt.execute({}, mockContext);

            expect(result).toEqual(messages);
            expect(mockContext.logger.info).toHaveBeenCalledWith(
                'Executing prompt: test',
                expect.any(Object)
            );
        });

        it('should throw ValidationError for missing required argument', async () => {
            const prompt = new Prompt({
                name: 'test',
                description: 'Test prompt',
                arguments: [
                    { name: 'required_arg', description: 'Required', required: true }
                ],
                handler: async () => []
            });

            await expect(prompt.execute({}, mockContext))
                .rejects.toThrow(ValidationError);
        });

        it('should pass with all required arguments', async () => {
            const prompt = new Prompt({
                name: 'test',
                description: 'Test prompt',
                arguments: [
                    { name: 'required_arg', description: 'Required', required: true }
                ],
                handler: async (args) => [
                    { role: 'assistant', content: `Got: ${args.required_arg}` }
                ]
            });

            const result = await prompt.execute({ required_arg: 'value' }, mockContext);

            expect(result).toHaveLength(1);
        });

        it('should log error when handler throws', async () => {
            const prompt = new Prompt({
                name: 'failing',
                description: 'Failing prompt',
                handler: async () => { throw new Error('Handler failed'); }
            });

            await expect(prompt.execute({}, mockContext)).rejects.toThrow('Handler failed');
            expect(mockContext.logger.error).toHaveBeenCalledWith(
                'Error executing prompt: failing',
                expect.any(Object)
            );
        });

        it('should convert to MCP prompt format', () => {
            const prompt = new Prompt({
                name: 'example',
                description: 'Example prompt',
                arguments: [
                    { name: 'arg1', description: 'Arg 1', required: true }
                ],
                handler: async () => []
            });

            const mcpPrompt = prompt.toMcpPrompt();

            expect(mcpPrompt).toEqual({
                name: 'example',
                description: 'Example prompt',
                arguments: [{ name: 'arg1', description: 'Arg 1', required: true }]
            });
        });
    });

    describe('createPrompt helper', () => {
        it('should create a Prompt instance', () => {
            const prompt = createPrompt({
                name: 'helper-test',
                description: 'Created via helper',
                handler: async () => []
            });

            expect(prompt).toBeInstanceOf(Prompt);
            expect(prompt.name).toBe('helper-test');
        });
    });
});
