import { ToolRegistry } from './toolRegistry.js';
import { ILogger } from '../types/logger.js';
import { ToolRequest, ToolResponse } from '../types/tool.js';
import { ExecutionResult, ExecutionOptions } from '../types/execution.js';
import { ToolNotFoundError, ValidationError, ToolExecutionError, formatErrorResponse } from '../utils/errors.js';

export class ToolExecutor {
  constructor(
    private registry: ToolRegistry,
    private logger: ILogger
  ) {}

  /**
   * Executes a registered tool by name with arguments and handles logging, timing, and error catch.
   */
  public async execute(
    request: ToolRequest,
    options: ExecutionOptions = { validateSchema: true }
  ): Promise<ExecutionResult> {
    const startTime = performance.now();
    const { name: toolName, args = {} } = request;

    this.logger.info(`Initiating tool execution: '${toolName}'`, { toolName, args });

    try {
      // 1. Validate tool existence
      const tool = this.registry.getTool(toolName);
      if (!tool) {
        throw new ToolNotFoundError(toolName);
      }

      // 2. Validate input schema if enabled
      let validatedArgs = args;
      if (options.validateSchema !== false && tool.inputSchema) {
        try {
          validatedArgs = await tool.inputSchema.parseAsync(args);
        } catch (validationErr: unknown) {
          const errMsg = validationErr instanceof Error ? validationErr.message : String(validationErr);
          throw new ValidationError(`Input argument validation failed for tool '${toolName}': ${errMsg}`);
        }
      }

      // 3. Execute tool handler
      const rawResult = await tool.execute(validatedArgs);

      // 4. Normalize response into standard MCP ToolResponse
      const response = this.normalizeResponse(rawResult);

      const endTime = performance.now();
      const durationMs = Math.round((endTime - startTime) * 100) / 100;

      this.logger.info(`Tool execution completed successfully: '${toolName}'`, {
        toolName,
        durationMs,
        isError: response.isError ?? false,
      });

      return {
        success: true,
        toolName,
        response,
        durationMs,
      };
    } catch (error: unknown) {
      const endTime = performance.now();
      const durationMs = Math.round((endTime - startTime) * 100) / 100;

      const formattedErr = error instanceof Error ? error : new ToolExecutionError(toolName, String(error));

      this.logger.error(`Tool execution failed: '${toolName}'`, {
        toolName,
        durationMs,
        error: formattedErr.message,
      });

      return {
        success: false,
        toolName,
        response: formatErrorResponse(formattedErr),
        durationMs,
        error: formattedErr.message,
      };
    }
  }

  /**
   * Helper to normalize raw tool return values into standard MCP ToolResponse objects.
   */
  private normalizeResponse(rawResult: unknown): ToolResponse {
    if (
      rawResult &&
      typeof rawResult === 'object' &&
      'content' in rawResult &&
      Array.isArray((rawResult as ToolResponse).content)
    ) {
      return rawResult as ToolResponse;
    }

    if (typeof rawResult === 'string') {
      return {
        content: [{ type: 'text', text: rawResult }],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(rawResult, null, 2),
        },
      ],
    };
  }
}
