import { describe, it, expect } from '@jest/globals';
import {
    McpError,
    ValidationError,
    ToolNotFoundError,
    ResourceNotFoundError,
    PromptNotFoundError,
    RateLimitError,
    ToolExecutionError,
    formatError
} from '../errors.js';

describe('MCP Errors', () => {
    describe('McpError', () => {
        it('should create error with message, code, and statusCode', () => {
            const error = new McpError('Test message', 'TEST_CODE', 400);

            expect(error.message).toBe('Test message');
            expect(error.code).toBe('TEST_CODE');
            expect(error.statusCode).toBe(400);
            expect(error.name).toBe('McpError');
        });

        it('should default statusCode to 500', () => {
            const error = new McpError('Test', 'CODE');
            expect(error.statusCode).toBe(500);
        });

        it('should include details if provided', () => {
            const error = new McpError('Test', 'CODE', 500, { extra: 'data' });
            expect(error.details).toEqual({ extra: 'data' });
        });

        it('should be instanceof Error', () => {
            const error = new McpError('Test', 'CODE');
            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('ValidationError', () => {
        it('should create with VALIDATION_ERROR code and 400 status', () => {
            const error = new ValidationError('Invalid input');

            expect(error.message).toBe('Invalid input');
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.statusCode).toBe(400);
            expect(error.name).toBe('ValidationError');
        });

        it('should include details', () => {
            const error = new ValidationError('Invalid', { field: 'email' });
            expect(error.details).toEqual({ field: 'email' });
        });
    });

    describe('ToolNotFoundError', () => {
        it('should create with TOOL_NOT_FOUND code and 404 status', () => {
            const error = new ToolNotFoundError('myTool');

            expect(error.message).toBe("Tool 'myTool' not found");
            expect(error.code).toBe('TOOL_NOT_FOUND');
            expect(error.statusCode).toBe(404);
            expect(error.name).toBe('ToolNotFoundError');
        });
    });

    describe('ResourceNotFoundError', () => {
        it('should create with RESOURCE_NOT_FOUND code and 404 status', () => {
            const error = new ResourceNotFoundError('file://test.txt');

            expect(error.message).toBe("Resource 'file://test.txt' not found");
            expect(error.code).toBe('RESOURCE_NOT_FOUND');
            expect(error.statusCode).toBe(404);
            expect(error.name).toBe('ResourceNotFoundError');
        });
    });

    describe('PromptNotFoundError', () => {
        it('should create with PROMPT_NOT_FOUND code and 404 status', () => {
            const error = new PromptNotFoundError('greeting');

            expect(error.message).toBe("Prompt 'greeting' not found");
            expect(error.code).toBe('PROMPT_NOT_FOUND');
            expect(error.statusCode).toBe(404);
            expect(error.name).toBe('PromptNotFoundError');
        });
    });

    describe('RateLimitError', () => {
        it('should create with default message', () => {
            const error = new RateLimitError();

            expect(error.message).toBe('Rate limit exceeded');
            expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
            expect(error.statusCode).toBe(429);
            expect(error.name).toBe('RateLimitError');
        });

        it('should allow custom message', () => {
            const error = new RateLimitError('Too many requests');
            expect(error.message).toBe('Too many requests');
        });
    });

    describe('ToolExecutionError', () => {
        it('should create with TOOL_EXECUTION_ERROR code and 500 status', () => {
            const originalError = new Error('Something went wrong');
            const error = new ToolExecutionError('myTool', originalError);

            expect(error.message).toBe("Error executing tool 'myTool': Something went wrong");
            expect(error.code).toBe('TOOL_EXECUTION_ERROR');
            expect(error.statusCode).toBe(500);
            expect(error.name).toBe('ToolExecutionError');
            expect(error.details).toMatchObject({ originalError: 'Something went wrong' });
        });
    });

    describe('formatError', () => {
        it('should format McpError', () => {
            const error = new ValidationError('Invalid input', { field: 'email' });
            const formatted = formatError(error);

            expect(formatted).toEqual({
                code: 'VALIDATION_ERROR',
                message: 'Invalid input',
                details: { field: 'email' }
            });
        });

        it('should format generic Error', () => {
            const error = new Error('Something went wrong');
            const formatted = formatError(error);

            expect(formatted).toEqual({
                code: 'INTERNAL_ERROR',
                message: 'Something went wrong'
            });
        });
    });
});
