import { describe, expect, it } from 'vitest';
import { ScopeGuard } from '../../src/gateway/scope.guard.js';

function context(toolName: string, scopes: string[], isAdmin = false) {
  return { toolName, auth: { subject: 'test', scopes, isAdmin } } as any;
}

describe('ScopeGuard', () => {
  const guard = new ScopeGuard();

  it('allows the correct scope for the actual diagnostics runtime name', async () => {
    await expect(
      guard.canActivate(context('diagnostics_interpret_lab_value', ['dx:read'])),
    ).resolves.toBe(true);
  });

  it('denies a write-like care tool to a read-only identity', async () => {
    await expect(
      guard.canActivate(context('care_draft_referral', ['care:read'])),
    ).rejects.toThrow('SCOPE_DENIED');
  });

  it('allows the admin wildcard only for the explicitly configured admin identity', async () => {
    await expect(
      guard.canActivate(context('fhir_get_immunizations', ['*'], true)),
    ).resolves.toBe(true);
  });

  it('rejects wildcard scope for non-admin identities', async () => {
    await expect(guard.canActivate(context('fhir_get_immunizations', ['*']))).rejects.toThrow(
      'Wildcard scope is restricted',
    );
  });

  it('fails closed for an unknown tool name', async () => {
    await expect(guard.canActivate(context('unregistered_tool', ['*']))).rejects.toThrow(
      'No authorization policy',
    );
  });

  it('fails closed when the tool name is missing', async () => {
    await expect(guard.canActivate(context('', ['triage:read']))).rejects.toThrow(
      'unnamed tool',
    );
  });
});
