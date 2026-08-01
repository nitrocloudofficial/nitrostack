import { Injectable } from '@nitrostack/core';
import type { Guard, ExecutionContext } from '@nitrostack/core';

/**
 * RedactionGuard — NitroStack-native guard.
 * Logs each tool invocation. Real PII redaction is handled by
 * ContextService.addClaim before claims are persisted.
 */
@Injectable()
export class RedactionGuard implements Guard {
  canActivate(context: ExecutionContext): boolean {
    const toolName = context.toolName ?? 'unknown';
    context.logger.info(`[RedactionGuard] Activated for tool: ${toolName}`);
    return true;
  }
}
