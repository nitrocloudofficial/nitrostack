import { Injectable, ExecutionContext } from '@nitrostack/core';
import { AppConfigService } from '../../config/app.config.js';

@Injectable()
export class ApiKeyGuard {
  constructor(private readonly config: AppConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredApiKey = process.env.API_KEY;
    if (!requiredApiKey) {
      return true;
    }

    const headers = (context as unknown as { headers?: Record<string, string> }).headers;
    const requestApiKey = headers?.['x-api-key'];
    if (requestApiKey === requiredApiKey) {
      return true;
    }

    context.logger.warn('Unauthorized request: API key missing or invalid');
    return false;
  }
}
