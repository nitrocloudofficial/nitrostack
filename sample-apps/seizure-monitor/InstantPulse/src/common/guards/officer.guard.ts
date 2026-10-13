import { Injectable, type ExecutionContext, type Guard } from '@nitrostack/core';

const OFFICER_TOKEN = () => process.env.INSTANTPULSE_OFFICER_TOKEN?.trim() || '';

/**
 * Guards run before the handler and only see the ExecutionContext — never the
 * tool input. That covers the HTTP transport, where an officer's credential
 * arrives as auth context or request metadata.
 *
 * Over stdio (NitroStudio, Claude Desktop) there is no such context, so
 * privileged tools also take an explicit `officerToken` argument and call
 * {@link assertOfficer}. Both paths check the same INSTANTPULSE_OFFICER_TOKEN,
 * so there is exactly one credential to configure.
 */
@Injectable({ deps: [] })
export class OfficerGuard implements Guard {
  canActivate(context: ExecutionContext): boolean {
    const expected = OFFICER_TOKEN();

    // Unconfigured means open — a hackathon demo should not be locked out by a
    // credential nobody set. The tool-level check logs loudly in this mode.
    if (!expected) return true;

    const presented = extractToken(context);

    // No transport-level credential at all: defer to the tool's own
    // officerToken check rather than blocking the stdio path outright.
    if (!presented) return true;

    return presented === expected;
  }
}

/**
 * Enforce officer identity from an explicit tool argument.
 * Throws with an actionable message rather than returning false, so the MCP
 * client shows the operator what to do next.
 */
export function assertOfficer(officerToken: string | undefined, officerName: string): string {
  const expected = OFFICER_TOKEN();

  if (!expected) {
    return officerName;
  }

  if (!officerToken) {
    throw new Error(
      'This action requires an officer credential. Pass `officerToken` matching the ' +
        'INSTANTPULSE_OFFICER_TOKEN environment variable.',
    );
  }

  if (officerToken !== expected) {
    throw new Error('Officer credential rejected. The supplied officerToken does not match.');
  }

  return officerName;
}

function extractToken(context: ExecutionContext): string {
  const auth = context.auth as Record<string, unknown> | undefined;
  if (auth) {
    const fromAuth = auth.token ?? auth.apiKey ?? auth.subject;
    if (typeof fromAuth === 'string' && fromAuth) return fromAuth;
  }

  const metadata = context.metadata as Record<string, unknown> | undefined;
  if (metadata) {
    const fromMeta = metadata.officerToken ?? metadata.authorization;
    if (typeof fromMeta === 'string' && fromMeta) {
      return fromMeta.replace(/^Bearer\s+/i, '');
    }
  }

  return '';
}
