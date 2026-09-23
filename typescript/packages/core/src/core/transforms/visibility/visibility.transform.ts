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
 * hidden, and every other tool stays visible. The modern adapter rejects
 * `tools/list` and `tools/call` that do not present a session id this process
 * minted, including on the `auto` protocol.
 *
 * `disableTools` on a visible tool is a per-session workflow gate for anonymous
 * callers. A new anonymous session starts with an empty deny list, so a tool
 * that must stay unreachable until an explicit grant has to be created with
 * `visibility: 'hidden'`. For a verified subject the same `disableTools` call
 * also writes a subject deny, and that deny applies on later session ids.
 */
export class VisibilityTransform extends CatalogTransform {
  readonly name = 'visibility';

  constructor(readonly store: SessionVisibilityStore) {
    super();
  }

  /**
   * `withBypass` exists so search and code mode do not rebuild while a tool
   * lists the catalog. It is not permission to reveal hidden tools.
   */
  protected honorsBypass(): boolean {
    return false;
  }

  /**
   * Filters the raw tool catalog down to tools authorized for the current session.
   */
  protected async applyTransform(tools: Tool[], context?: ExecutionContext): Promise<Tool[]> {
    // No session: hidden tools stay hidden. A verified subject deny still applies.
    if (!context?.sessionId) {
      return tools.filter((tool) => {
        if (
          context?.verifiedSubject &&
          this.store.hasSubjectDisabled(context.verifiedSubject, tool.name)
        ) {
          return false;
        }
        return tool.visibility !== 'hidden';
      });
    }

    const session = this.store.getSession(context.sessionId);

    return tools.filter((tool) => {
      // Subject denies survive a new session id and win over a fresh session.
      if (
        context.verifiedSubject &&
        this.store.hasSubjectDisabled(context.verifiedSubject, tool.name)
      ) {
        return false;
      }
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

    if (
      context?.verifiedSubject &&
      this.store.hasSubjectDisabled(context.verifiedSubject, name)
    ) {
      throw new VisibilityResolutionError(
        `Tool '${name}' is disabled for subject '${context.verifiedSubject}'.`
      );
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
