import { PromptDefinition, ExecutionContext, PromptMessage, PromptArgument, PromptArgumentValue, JsonObject } from './types.js';
import { ValidationError } from './errors.js';

/**
 * MCP Prompt metadata structure (full spec compliance)
 */
interface McpPrompt {
  name: string;
  title?: string;
  description: string;
  arguments: PromptArgument[];
}

/**
 * Prompt class provides a clean abstraction for defining and executing prompts
 */
// Enforces the PromptMessage contract (see types.ts): role in
// user|assistant|system and string content. Structured content blocks are not
// supported here by design; supporting them requires changing the PromptMessage
// type and the server-side MCP mapping together.
function validateMessageFormat(msg: any): PromptMessage {
  if (!msg || typeof msg !== 'object') {
    throw new ValidationError('Invalid prompt message format: message must be an object');
  }
  if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
    throw new ValidationError(`Invalid prompt message role: '${msg.role}'. Must be 'user', 'assistant', or 'system'`);
  }
  if (typeof msg.content !== 'string') {
    throw new ValidationError('Invalid prompt message content: content must be a string');
  }
  return {
    role: msg.role,
    content: msg.content,
  };
}

function normalizePromptResponse(result: unknown): PromptMessage[] {
  if (result === null || result === undefined) {
    return [];
  }
  const arrayResult = Array.isArray(result) ? result : [result];
  return arrayResult.map(validateMessageFormat);
}

export class Prompt {
  private definition: PromptDefinition;

  constructor(definition: PromptDefinition) {
    this.definition = definition;
  }

  /**
   * Get prompt name
   */
  get name(): string {
    return this.definition.name;
  }

  /**
   * Get prompt title (display name)
   */
  get title(): string | undefined {
    return this.definition.title;
  }

  /**
   * Get prompt description
   */
  get description(): string {
    return this.definition.description;
  }

  /**
   * Get prompt arguments
   */
  get arguments(): PromptArgument[] {
    return this.definition.arguments || [];
  }

  /**
   * Execute the prompt with provided arguments
   */
  async execute(args: Record<string, PromptArgumentValue>, context: ExecutionContext): Promise<PromptMessage[]> {
    // Validate required arguments
    this.validateArguments(args);

    context.logger.info(`Executing prompt: ${this.name}`, { args: args as unknown as JsonObject });

    try {
      const messagesResult = await this.definition.handler(args, context);
      const messages = normalizePromptResponse(messagesResult);
      
      context.logger.info(`Prompt executed successfully: ${this.name}`, {
        messageCount: messages.length,
      });

      return messages;
    } catch (error) {
      context.logger.error(`Error executing prompt: ${this.name}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Validate prompt arguments
   */
  private validateArguments(args: Record<string, PromptArgumentValue>): void {
    if (!this.definition.arguments) return;

    for (const arg of this.definition.arguments) {
      if (arg.required && !(arg.name in args)) {
        throw new ValidationError(
          `Missing required argument '${arg.name}' for prompt '${this.name}'`
        );
      }
    }
  }

  /**
   * Create prompt metadata for MCP protocol (full spec compliance)
   */
  toMcpPrompt(): McpPrompt {
    const prompt: McpPrompt = {
      name: this.name,
      description: this.description,
      arguments: this.arguments,
    };

    if (this.title) prompt.title = this.title;

    return prompt;
  }
}

/**
 * Helper function to create a prompt
 */
export function createPrompt(definition: PromptDefinition): Prompt {
  return new Prompt(definition);
}


