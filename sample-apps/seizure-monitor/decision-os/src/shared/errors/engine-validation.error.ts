export class EngineValidationError extends Error {
  constructor(
    public engineId: string,
    public errors: string[],
    message?: string
  ) {
    super(message || `Validation failed in engine ${engineId}: ${errors.join(', ')}`);
    this.name = 'EngineValidationError';
  }
}
