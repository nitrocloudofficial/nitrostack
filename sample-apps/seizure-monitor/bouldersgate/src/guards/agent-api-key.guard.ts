import {
  ApiKeyModule,
  Injectable,
  type ExecutionContext,
  type Guard,
} from '@nitrostack/core';
import { createHash } from 'node:crypto';

/**
 * Read the credential from `context.metadata`, which NitroStack populates from
 * the `_meta` object inside a tool call's arguments. Clients that can construct
 * `_meta` by hand (stdio, tests, CI) authenticate through this path.
 */
export function credentialFromMetadata(context: ExecutionContext): unknown {
  const config = ApiKeyModule.getConfig();
  const metadata = context.metadata ?? {};
  return (
    metadata[config.metadataField ?? 'apiKey'] ??
    metadata[config.headerName ?? 'x-api-key']
  );
}

/**
 * Validate a credential and, on success, attach the agent identity to the
 * context. The identity is a SHA-256 fingerprint of the key, so the key itself
 * is never logged, stored, or returned over the protocol.
 */
export async function authenticateAgent(
  candidate: unknown,
  context: ExecutionContext,
): Promise<boolean> {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    context.logger.warn('BouldersGate request rejected: missing API key.');
    return false;
  }

  if (!(await ApiKeyModule.validate(candidate))) {
    context.logger.warn('BouldersGate request rejected: invalid API key.');
    return false;
  }

  const fingerprint = createHash('sha256').update(candidate).digest('hex').slice(0, 16);
  context.auth = {
    subject: `agent_${fingerprint}`,
    scopes: ['compute:request', 'compute:execute'],
  };
  return true;
}

/**
 * Demo mode. When `BOULDERSGATE_DEMO_NO_AUTH=true`, an unauthenticated call is
 * admitted under one shared identity instead of being rejected, so a public
 * demo works without handing out a credential.
 *
 * This is off unless the deployment opts in, because it removes the only thing
 * separating callers: every anonymous agent becomes `agent_demo`, so one caller
 * can execute in, list, and release another's environments. Policy evaluation,
 * offer TTLs, single-use offers, and the execution sandbox are unaffected.
 * A supplied key still authenticates normally and keeps its own identity.
 */
export const DEMO_IDENTITY = 'agent_demo';

export function demoModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.BOULDERSGATE_DEMO_NO_AUTH?.trim().toLowerCase() === 'true';
}

export function assignDemoIdentity(context: ExecutionContext): void {
  context.logger.warn(
    'BouldersGate admitted an unauthenticated request: BOULDERSGATE_DEMO_NO_AUTH is enabled and callers share one identity.',
  );
  context.auth = {
    subject: DEMO_IDENTITY,
    scopes: ['compute:request', 'compute:execute'],
  };
}

@Injectable()
export class AgentApiKeyGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    return authenticateAgent(credentialFromMetadata(context), context);
  }
}
