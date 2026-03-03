import { PostHog } from 'posthog-node';
import { createHash } from 'crypto';
import os from 'os';
import { createRequire } from 'module';

const POSTHOG_API_KEY = 'phc_OufG1OuiamSbCBMVHfO70IyFWKBzsiaDpOWqcNwtz6G';
const POSTHOG_HOST = 'https://us.i.posthog.com';

let client: PostHog | null = null;
let distinctId: string | null = null;
let cliVersion: string | null = null;

function getClient(): PostHog {
  if (!client) {
    client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

function getDistinctId(): string {
  if (!distinctId) {
    try {
      const raw = `${os.hostname()}:${os.userInfo().username}`;
      distinctId = createHash('sha256').update(raw).digest('hex').slice(0, 16);
    } catch {
      distinctId = 'anonymous';
    }
  }
  return distinctId;
}

function getCliVersion(): string {
  if (!cliVersion) {
    try {
      const req = createRequire(import.meta.url);
      const pkg = req('../../package.json');
      cliVersion = pkg.version ?? 'unknown';
    } catch {
      cliVersion = 'unknown';
    }
  }
  return cliVersion!;
}

function getGlobalProperties(): Record<string, string> {
  return {
    cli_version: getCliVersion(),
    node_version: process.version,
    os_platform: process.platform,
    os_arch: process.arch,
  };
}

/**
 * Capture an analytics event. Non-blocking, fire-and-forget.
 */
export function trackEvent(event: string, properties: Record<string, unknown> = {}): void {
  try {
    getClient().capture({
      distinctId: getDistinctId(),
      event,
      properties: {
        ...getGlobalProperties(),
        ...properties,
      },
    });
  } catch {
    // Never let analytics break CLI functionality
  }
}

/**
 * Flush pending events and shut down. Call before process.exit().
 */
export async function shutdownAnalytics(): Promise<void> {
  if (client) {
    try {
      await client.shutdown();
    } catch {
      // Ignore shutdown errors
    }
    client = null;
  }
}
