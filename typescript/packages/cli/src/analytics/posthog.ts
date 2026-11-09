import { PostHog } from 'posthog-node';
import { createHash } from 'crypto';
import os from 'os';
import { createRequire } from 'module';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

let client: PostHog | null = null;
let initAttempted = false;
let anonymousDistinctId: string | null = null;
let identifiedDistinctId: string | null = null;
let identifiedEmail: string | undefined;
let activeOrganizationId: string | null = null;
/** True when session was loaded from disk — skip duplicate alias to same user in this process. */
let skipAliasOnce = false;

let cliVersion: string | null = null;

function debugLog(message: string, err?: unknown): void {
  if (process.env.NITROSTACK_ANALYTICS_DEBUG !== '1') {
    return;
  }
  if (err !== undefined) {
    console.debug(`[nitrostack:analytics] ${message}`, err);
  } else {
    console.debug(`[nitrostack:analytics] ${message}`);
  }
}

/**
 * True when telemetry must not run (user opt-out, tests, CI without explicit enable).
 */
export function isTelemetryDisabled(): boolean {
  if (process.env.DO_NOT_TRACK === '1') {
    return true;
  }
  const v = process.env.NITROSTACK_TELEMETRY?.toLowerCase();
  if (v === '0' || v === 'false' || v === 'no') {
    return true;
  }
  if (process.env.CI === 'true' && process.env.NITROSTACK_ANALYTICS_IN_CI !== '1') {
    return true;
  }
  return false;
}

function getPosthogApiKey(): string | undefined {
  const k = process.env.NITROSTACK_POSTHOG_KEY?.trim();
  return k || undefined;
}

function getPosthogHost(): string {
  return (process.env.NITROSTACK_POSTHOG_HOST || DEFAULT_POSTHOG_HOST).replace(/\/+$/, '');
}

function resolveEnvironment(): 'production' | 'staging' | 'development' {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  if (nodeEnv === 'production') {
    return 'production';
  }
  if (nodeEnv === 'staging') {
    return 'staging';
  }
  return 'development';
}

export function getAnonymousDistinctId(): string {
  if (!anonymousDistinctId) {
    try {
      const raw = `${os.hostname()}:${os.userInfo().username}`;
      anonymousDistinctId = createHash('sha256').update(raw).digest('hex').slice(0, 16);
    } catch {
      anonymousDistinctId = 'anonymous';
    }
  }
  return anonymousDistinctId;
}

function getDistinctIdForCapture(): string {
  return identifiedDistinctId || getAnonymousDistinctId();
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
  return cliVersion ?? 'unknown';
}

function getAppVersion(): string {
  return getCliVersion();
}

export function getGlobalEventProperties(): Record<string, string> {
  return {
    product: 'cli',
    surface: 'terminal',
    environment: resolveEnvironment(),
    app_version: getAppVersion(),
    cli_version: getCliVersion(),
    node_version: process.version,
    os_platform: process.platform,
    os_arch: process.arch,
  };
}

function getClient(): PostHog | null {
  if (isTelemetryDisabled()) {
    return null;
  }
  const apiKey = getPosthogApiKey();
  if (!apiKey) {
    return null;
  }
  if (!client && !initAttempted) {
    initAttempted = true;
    try {
      client = new PostHog(apiKey, {
        host: getPosthogHost(),
        flushAt: 20,
        flushInterval: 5000,
      });
    } catch (err) {
      debugLog('Failed to initialize PostHog client', err);
      client = null;
    }
  }
  return client;
}

function mergeIdentityProps(properties: Record<string, unknown>): Record<string, unknown> {
  const next = { ...properties };
  if (identifiedDistinctId) {
    next.cloud_user_id = identifiedDistinctId;
  }
  if (identifiedEmail) {
    next.user_email = identifiedEmail;
  }
  return next;
}

function resolveGroups(extra?: Record<string, string>): Record<string, string> | undefined {
  const g: Record<string, string> = { ...extra };
  if (activeOrganizationId) {
    g.organization = activeOrganizationId;
  }
  return Object.keys(g).length > 0 ? g : undefined;
}

export interface TrackEventOptions {
  /** Additional PostHog groups (merged with active organization when set). */
  groups?: Record<string, string>;
}

/**
 * Capture an analytics event. Non-blocking; swallows errors.
 */
export function trackEvent(
  event: string,
  properties: Record<string, unknown> = {},
  options: TrackEventOptions = {},
): void {
  const ph = getClient();
  if (!ph) {
    return;
  }
  try {
    const props = mergeIdentityProps({
      ...getGlobalEventProperties(),
      ...properties,
    });
    const groups = resolveGroups(options.groups);
    ph.capture({
      distinctId: getDistinctIdForCapture(),
      event,
      properties: props,
      ...(groups ? { groups } : {}),
    });
  } catch (err) {
    debugLog(`trackEvent(${event}) failed`, err);
  }
}

/**
 * After a successful NitroCloud login: alias anonymous → Cloud user, identify, set person email.
 */
export function onLoginSuccess(cloudUserId: string, email?: string): void {
  if (isTelemetryDisabled() || !cloudUserId) {
    return;
  }
  const ph = getClient();
  if (!ph) {
    identifiedDistinctId = cloudUserId;
    identifiedEmail = email;
    return;
  }
  try {
    const anon = getAnonymousDistinctId();
    if (!skipAliasOnce) {
      ph.alias({ distinctId: anon, alias: cloudUserId });
    } else {
      skipAliasOnce = false;
    }
    ph.identify({
      distinctId: cloudUserId,
      properties: {
        email: email || undefined,
      },
    });
    identifiedDistinctId = cloudUserId;
    identifiedEmail = email;
  } catch (err) {
    debugLog('onLoginSuccess failed', err);
  }
}

/**
 * Restore identified user from persisted session (new process). Does not send alias (login already did).
 */
export function hydrateAnalyticsFromSession(cloudUserId: string, email?: string): void {
  if (isTelemetryDisabled() || !cloudUserId) {
    return;
  }
  skipAliasOnce = true;
  identifiedDistinctId = cloudUserId;
  identifiedEmail = email;
  const ph = getClient();
  if (!ph) {
    return;
  }
  try {
    ph.identify({
      distinctId: cloudUserId,
      properties: {
        email: email || undefined,
      },
    });
  } catch (err) {
    debugLog('hydrateAnalyticsFromSession failed', err);
  }
}

/**
 * Associate subsequent events with an organization (group analytics).
 */
export function setAnalyticsOrganization(organizationId: string | null): void {
  activeOrganizationId = organizationId || null;
  const ph = getClient();
  if (!ph || !organizationId || !identifiedDistinctId) {
    return;
  }
  try {
    ph.groupIdentify({
      groupType: 'organization',
      groupKey: organizationId,
      distinctId: identifiedDistinctId,
      properties: {},
    });
  } catch (err) {
    debugLog('groupIdentify failed', err);
  }
}

/**
 * Clear identified user and org (e.g. after logout).
 */
export function resetAnalyticsIdentity(): void {
  identifiedDistinctId = null;
  identifiedEmail = undefined;
  activeOrganizationId = null;
  skipAliasOnce = false;
}

/**
 * Flush pending events and shut down. Call before process.exit().
 */
export async function shutdownAnalytics(): Promise<void> {
  if (client) {
    try {
      await client.shutdown();
    } catch (err) {
      debugLog('shutdownAnalytics failed', err);
    }
    client = null;
    initAttempted = false;
  }
}

/** @internal Testing hook */
export function __resetAnalyticsModuleForTests(): void {
  client = null;
  initAttempted = false;
  anonymousDistinctId = null;
  identifiedDistinctId = null;
  identifiedEmail = undefined;
  activeOrganizationId = null;
  skipAliasOnce = false;
  cliVersion = null;
}
