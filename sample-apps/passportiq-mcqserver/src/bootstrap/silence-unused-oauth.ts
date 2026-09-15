/**
 * Silences one line of cosmetic core noise at boot. Backend B owns this file.
 *
 * WHAT YOU SEE WITHOUT IT
 * -----------------------
 * `npx tsx src/index.ts` boots fully and correctly — all tools registered, bridge
 * installed, seed loaded — and then, during `app.start()`, dumps a multi-line
 * red error:
 *
 *     Failed to instantiate provider "class OAuthModule { ... <entire class source> }":
 *     Cannot resolve token "OAUTH_CONFIG". No value or provider registered.
 *
 * WHY IT HAPPENS
 * --------------
 * @nitrostack/core's own OAuthModule is decorated with `@Injectable()`, which
 * self-registers it into the global DIContainer the moment the module is imported
 * — and core imports it unconditionally in `app-decorator.js` to check whether
 * OAuth is configured. Its constructor takes `@Inject('OAUTH_CONFIG')`, a token
 * only registered by `OAuthModule.forRoot()`. PassportIQ does not use OAuth, so
 * the token never exists.
 *
 * `NitroStackServer.start()` then calls `DIContainer.instantiateAll()`, which
 * eagerly constructs *every* registered provider so uninjected singletons still
 * get their lifecycle hooks. OAuthModule cannot be constructed, so it is logged
 * and skipped — see container.js:107-120, whose own comment says a failing
 * provider is "logged (if a logger is supplied) and skipped so one bad token does
 * not abort startup".
 *
 * So: NOT a PassportIQ bug, NOT fatal, and nothing downstream reads OAuthModule.
 * It is purely a scary-looking log line.
 *
 * WHY WE STILL SUPPRESS IT
 * ------------------------
 * This server is demoed live with the console on screen, and stdio is the MCP
 * transport. A full class-source error dump next to our own boot banner reads as
 * "their server is broken" to a judge, and it buries the two warnings that
 * genuinely matter (placeholder stages active / decision guard bypassed).
 *
 * HOW
 * ---
 * `instantiateAll()` skips any token already present in the instances map
 * (`if (this.instances.has(token)) continue;`). Pre-seeding the OAuthModule token
 * with `null` via `registerValue` therefore makes the eager pass skip it — no
 * core patching, no logger filtering, no swallowed exceptions.
 *
 * SAFETY
 * ------
 *  - Guarded by `OAuthModule.getConfig()`: if anyone ever calls
 *    `OAuthModule.forRoot(...)`, config is non-null and we do nothing at all, so
 *    real OAuth wiring resolves normally. Adding OAuth cannot silently break.
 *  - We never call the constructor, so the static `OAuthModule.config` is not
 *    touched and transport selection is unaffected (still stdio in dev).
 *  - Nothing in PassportIQ injects OAuthModule, so the `null` placeholder is
 *    unreachable; only core's eager pass ever looks at that token.
 */
import { DIContainer, OAuthModule, type Logger } from '@nitrostack/core';

/**
 * @param container - the global DI container (same singleton core uses)
 * @param logger - optional; a one-line debug note so this is discoverable
 * @returns true if the placeholder was installed, false if OAuth is in use
 */
export function silenceUnusedOAuthProvider(container: DIContainer, logger?: Logger): boolean {
  // Someone configured OAuth for real — leave the container completely alone.
  if (OAuthModule.getConfig() !== null) {
    return false;
  }

  // NOTE: do NOT gate this on `container.has(OAuthModule)`. `has()` is true the
  // moment core's module is imported, because `@Injectable()` self-registers the
  // class in the *providers* map — which is exactly the situation we are fixing.
  // The skip in `instantiateAll()` keys off the *instances* map instead, and that
  // map has no public read accessor, so we unconditionally seed it. `registerValue`
  // is a plain `Map.set`, so repeating it is harmless and idempotent.
  container.registerValue(OAuthModule, null);
  logger?.debug(
    'Suppressed core OAuthModule eager-instantiation error (OAuth not configured for PassportIQ)'
  );
  return true;
}
