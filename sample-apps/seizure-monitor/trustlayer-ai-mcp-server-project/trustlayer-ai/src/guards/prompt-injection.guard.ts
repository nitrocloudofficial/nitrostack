import { Injectable } from '@nitrostack/core';
import type { Guard, ExecutionContext } from '@nitrostack/core';

/**
 * PromptInjectionGuard — NitroStack-native guard.
 * Logs each tool invocation. Real injection protection is handled by
 * strict role separation in the LLM calls (seller text wrapped in <user_input> tags).
 */
@Injectable()
export class PromptInjectionGuard implements Guard {
  canActivate(context: ExecutionContext): boolean {
    const toolName = context.toolName ?? 'unknown';
    context.logger.info(`[PromptInjectionGuard] Activated for tool: ${toolName}`);
    return true;
  }
}
