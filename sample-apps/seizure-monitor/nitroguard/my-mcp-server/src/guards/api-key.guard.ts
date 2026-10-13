import { Guard, ExecutionContext } from '@nitrostack/core';

export class ApiKeyGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = context.metadata || {};
    const apiKey = (metadata['x-api-key'] || metadata['apiKey'] || metadata['x-api-token']) as string | undefined;
    const requiredKey = process.env.API_KEY || 'nitroguard-secret-key';
    
    context.logger.info('ApiKeyGuard checking key authentication', {
      providedKey: apiKey ? '***' : 'none',
      requiredKey: '***'
    });

    if (apiKey === requiredKey) {
      context.auth = {
        subject: 'authenticated-mcp-client',
        scopes: ['execute', 'read']
      };
      return true;
    }
    
    context.logger.warn('ApiKeyGuard: Invalid or missing API key');
    return false;
  }
}
