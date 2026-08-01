import { ApplicationError } from './ApplicationError.js';
import { PlatformType } from '../enums/platform.enum.js';

export class IntegrationError extends ApplicationError {
  public readonly platform: PlatformType;

  constructor(message: string, platform: PlatformType, details?: Record<string, unknown>) {
    super(message, 'INTEGRATION_ERROR', 502, details);
    this.platform = platform;
  }
}
