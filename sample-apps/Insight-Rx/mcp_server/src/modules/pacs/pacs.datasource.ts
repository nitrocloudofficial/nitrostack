import { Injectable, OnModuleInit } from '@nitrostack/core';

/**
 * Data-source interlock -- makes "simulated only, because there is no
 * auth" a guarantee the process enforces rather than a claim in a
 * comment.
 *
 * THE RISK THIS CLOSES: this server has no authentication. No guard, no
 * API key, no configured OAuth. It is deployed to a public URL, and that
 * is tolerable for exactly one reason -- every byte it serves is
 * fabricated. The failure mode is not someone attacking it; it is
 * somebody later pointing it at a real PACS, in good faith, and
 * unauthenticated patient data becoming reachable from the open internet
 * without anyone noticing the precondition had changed.
 *
 * So the precondition is checked, at boot, before the server listens:
 *
 *   DATA_SOURCE != SIMULATED  AND  no auth configured  ->  refuse to boot
 *
 * onModuleInit runs after modules initialize and before the transport
 * starts accepting connections, so throwing here means the process never
 * serves a single request in that state. Failing closed is the point:
 * a server that will not start is a loud, immediate problem, whereas one
 * that starts and quietly serves real records is a silent one.
 */

export const SIMULATED = 'SIMULATED';

/**
 * Environment variables that would indicate an auth mechanism is
 * actually configured. Presence-checked only -- this module does not
 * validate credentials, it just refuses to assume protection that has
 * not been set up. Names are kept broad because the auth layer does not
 * exist yet; whichever lands, set its variable and this clears.
 */
const AUTH_ENV_VARS = [
  'MCP_API_KEY',
  'MCP_AUTH_TOKEN',
  'OAUTH_ISSUER',
  'OAUTH_CLIENT_ID',
  'AUTH_JWKS_URL',
] as const;

/** The configured mode. Defaults to SIMULATED -- the safe value. */
export function getDataSource(): string {
  return (process.env.DATA_SOURCE ?? SIMULATED).trim().toUpperCase();
}

export function isSimulated(): boolean {
  return getDataSource() === SIMULATED;
}

export function configuredAuthMechanisms(): string[] {
  return AUTH_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function isAuthConfigured(): boolean {
  return configuredAuthMechanisms().length > 0;
}

@Injectable()
export class DataSourceGuard implements OnModuleInit {
  onModuleInit(): void {
    const dataSource = getDataSource();

    if (dataSource === SIMULATED) {
      // stderr, never stdout -- stdout carries the JSON-RPC frames.
      process.stderr.write(
        `[pacs] DATA_SOURCE=${dataSource}: serving fixtures only. ` +
          'No real patient data is reachable through this server.\n',
      );
      return;
    }

    if (!isAuthConfigured()) {
      throw new Error(
        `REFUSING TO START: DATA_SOURCE is "${dataSource}" (not ${SIMULATED}), but no ` +
          'authentication is configured, so this server would expose non-simulated patient ' +
          'data to unauthenticated callers on a public URL.\n' +
          `  Configure one of: ${AUTH_ENV_VARS.join(', ')}\n` +
          `  ...or set DATA_SOURCE=${SIMULATED} to continue serving fixtures.\n` +
          '  This check is deliberate and must not be bypassed by removing it: it is the ' +
          'only thing standing between a config change and unauthenticated PHI.',
      );
    }

    process.stderr.write(
      `[pacs] DATA_SOURCE=${dataSource} with auth configured ` +
        `(${configuredAuthMechanisms().join(', ')}). Non-simulated mode permitted.\n`,
    );
  }
}
