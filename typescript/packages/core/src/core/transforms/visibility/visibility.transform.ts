import { CatalogTransform } from '../catalog.transform.js';
import { Tool } from '../../tool.js';
import { ExecutionContext } from '../../types.js';
import { SessionVisibilityStore } from './session-store.js';

export class VisibilityResolutionError extends Error {
  readonly code = -32601;

  constructor(message: string) {
    super(message);
    this.name = 'VisibilityResolutionError';
    Object.setPrototypeOf(this, VisibilityResolutionError.prototype);
  }
}

/**
 * Session visibility.
 *
 * A missing session id is not an authorization decision: hidden tools stay
 * hidden, and every other tool stays visible. On the modern adapter that is
 * not running in stateless mode, `tools/list` and `tools/call` without a
 * session are rejected before this transform runs. Stateless HTTP cannot
 * honor `disableTools`; the server logs that when this transform is registered
 * on the auto protocol era.
 */
export class VisibilityTransform extends CatalogTransform {
  readonly name = 'visibility';

  constructor(readonly store: SessionVisibilityStore) {
    super();
  }

  /**
   * Filters the raw tool catalog down to tools authorized for the current session.
   */
  protected async applyTransform(tools: Tool[], context?: ExecutionContext): Promise<Tool[]> {
    // If withBypass is active (e.g. admin or re-entrant internal system call), return all tools
    if (CatalogTransform.isBypassed()) {
      return tools;
    }

    // Stateless or unauthenticated requests: show all tools not marked hidden
    if (!context?.sessionId) {
      return tools.filter((t) => t.visibility !== 'hidden');
    }

    const session = this.store.getSession(context.sessionId);

    return tools.filter((tool) => {
      // 1. Explicit revokes survive session eviction and always win
      if (this.store.hasDisabled(context.sessionId!, tool.name)) {
        return false;
      }
      if (!session) {
        return tool.visibility !== 'hidden';
      }
      // 2. Explicitly enabled for this session always wins
      if (session.enabledTools.has(tool.name)) {
        return true;
      }
      // 3. Fallback to default visibility
      return tool.visibility !== 'hidden';
    });
  }

  /**
   * Intercepts direct tool calls (tools/call).
   * Guards against calls to hidden or revoked tools by throwing JSON-RPC -32601.
   */
  async resolveTool(
    name: string,
    next: (name: string, ctx?: ExecutionContext) => Promise<Tool | undefined>,
    context?: ExecutionContext
  ): Promise<Tool | undefined> {
    // Catalog bypass must not skip this guard. withBypass only suppresses
    // catalog reshaping so a tool can list tools without re-entering the pipeline.
    const tool = await next(name, context);
    if (!tool) {
      return undefined;
    }

    // Guard checks:
    if (context?.sessionId) {
      const session = this.store.getSession(context.sessionId);

      if (this.store.hasDisabled(context.sessionId, name)) {
        throw new VisibilityResolutionError(`Tool '${name}' is disabled in session '${context.sessionId}'.`);
      }

      if (tool.visibility === 'hidden' && !session?.enabledTools.has(name)) {
        throw new VisibilityResolutionError(`Tool '${name}' is not available in session '${context.sessionId}'.`);
      }
    } else {
      // Stateless request attempting to invoke hidden tool
      if (tool.visibility === 'hidden') {
        throw new VisibilityResolutionError(`Tool '${name}' is hidden and cannot be invoked in stateless mode.`);
      }
    }

    return tool;
  }
}
