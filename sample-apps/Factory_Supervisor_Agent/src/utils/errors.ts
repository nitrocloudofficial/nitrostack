import { ToolResponse } from '../types/tool.js';

export class MCPError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'MCPError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ToolNotFoundError extends MCPError {
  constructor(toolName: string) {
    super(`Tool '${toolName}' not found in registry`, 'TOOL_NOT_FOUND');
    this.name = 'ToolNotFoundError';
  }
}

export class ToolExecutionError extends MCPError {
  constructor(toolName: string, message: string, public readonly originalError?: unknown) {
    super(`Execution of tool '${toolName}' failed: ${message}`, 'TOOL_EXECUTION_ERROR');
    this.name = 'ToolExecutionError';
  }
}

export class ValidationError extends MCPError {
  constructor(message: string) {
    super(`Validation error: ${message}`, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends MCPError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

export function formatErrorResponse(error: unknown): ToolResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${errorMessage}`,
      },
    ],
    isError: true,
  };
}
