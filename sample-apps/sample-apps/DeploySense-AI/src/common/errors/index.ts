export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class DataNotFoundError extends BaseError {
  constructor(entity: string) {
    super(`${entity} not found.`);
  }
}

export class McpExecutionError extends BaseError {
  constructor(toolName: string, detail: string) {
    super(`Error executing tool ${toolName}: ${detail}`);
  }
}
