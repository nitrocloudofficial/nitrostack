import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { ApiKeyGuard } from '../../src/gateway/api-key.guard.js';
import { hasAdminScope, ScopeGuard } from '../../src/gateway/scope.guard.js';

describe('ApiKeyGuard anonymous mode', () => {
  it('is opt-in and grants full clinical scopes (never admin) when enabled', async () => {
    const previous = env.VITALIS_ALLOW_ANONYMOUS_DEMO;
    (env as any).VITALIS_ALLOW_ANONYMOUS_DEMO = true;

    try {
      const context = {
        toolName: 'triage_get_care_options',
        metadata: {},
      } as any;

      await expect(new ApiKeyGuard().canActivate(context)).resolves.toBe(true);
      expect(context.auth).toMatchObject({
        subject: 'anonymous_demo',
        authMethod: 'anonymous',
        isAdmin: false,
      });
      await expect(new ScopeGuard().canActivate(context)).resolves.toBe(true);

      // Demo mode also covers care:write tools (med reconciliation, referrals).
      context.toolName = 'care_draft_referral';
      await expect(new ScopeGuard().canActivate(context)).resolves.toBe(true);

      // But it never escalates to admin/wildcard privileges.
      expect(context.auth.scopes).not.toContain('*');
      expect(hasAdminScope(context.auth)).toBe(false);
    } finally {
      (env as any).VITALIS_ALLOW_ANONYMOUS_DEMO = previous;
    }
  });
});
