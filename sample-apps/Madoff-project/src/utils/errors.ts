export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Hide stack trace in production or entirely per requirements
    delete this.stack;
  }
}

export class DatasetError extends BaseError {}
export class ValidationError extends BaseError {}
export class AIServiceError extends BaseError {}
export class RuleEngineError extends BaseError {}
export class ResourceNotFoundError extends BaseError {}
export class TimeoutError extends BaseError {}
