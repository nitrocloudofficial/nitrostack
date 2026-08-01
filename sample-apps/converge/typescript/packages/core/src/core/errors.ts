/**
 * Base error class for MCP server errors
 */
export class McpError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'McpError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
export class ValidationError extends McpError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Tool not found error
 */
export class ToolNotFoundError extends McpError {
  constructor(toolName: string) {
    super(`Tool '${toolName}' not found`, 'TOOL_NOT_FOUND', 404);
    this.name = 'ToolNotFoundError';
  }
}

/**
 * Resource not found error
 */
export class ResourceNotFoundError extends McpError {
  constructor(uri: string) {
    super(`Resource '${uri}' not found`, 'RESOURCE_NOT_FOUND', 404);
    this.name = 'ResourceNotFoundError';
  }
}

/**
 * Prompt not found error
 */
export class PromptNotFoundError extends McpError {
  constructor(promptName: string) {
    super(`Prompt '${promptName}' not found`, 'PROMPT_NOT_FOUND', 404);
    this.name = 'PromptNotFoundError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends McpError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Tool execution error
 */
export class ToolExecutionError extends McpError {
  constructor(toolName: string, originalError: Error) {
    super(
      `Error executing tool '${toolName}': ${originalError.message}`,
      'TOOL_EXECUTION_ERROR',
      500,
      { originalError: originalError.message, stack: originalError.stack }
    );
    this.name = 'ToolExecutionError';
  }
}

/**
 * Format error for response
 */
export function formatError(error: Error): {
  code: string;
  message: string;
  details?: unknown;
} {
  if (error instanceof McpError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: error.message,
  };
}


