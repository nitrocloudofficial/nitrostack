// AWS connector configuration, error codes and scrubbing. Nothing here ever returns a secret.
// Operator env: METAMORPH_AWS_ROLE_ARN, METAMORPH_AWS_EXTERNAL_ID, optional METAMORPH_AWS_REGIONS (comma list).
// The base identity comes from the standard AWS SDK credential chain and should be allowed ONLY sts:AssumeRole on that role.
import { redact } from '../../common/redact.js';

export const SETUP_HINT = 'See docs/AWS_SETUP.md.';
export const ROLE_ARN_RE = /^arn:aws:iam::(\d{12}):role\/[A-Za-z0-9+=,.@_/-]{1,256}$/;
const EXTERNAL_ID_RE = /^[A-Za-z0-9+=,.@:/_-]{2,1224}$/;
export const REGION_RE = /^[a-z]{2}(?:-[a-z]+)+-\d{1,2}$/;
export const MAX_REGIONS = 6;

/** Error whose message is safe to show: it never contains a credential, token or value of an env variable. */
export class CloudError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'CloudError';
  }
}

export interface AwsConfig {
  roleArn: string;
  externalId: string;
  regions: string[];
}

const NOT_CONFIGURED = `AWS inventory is not configured on this server. Ask the server operator to finish the AWS setup. ${SETUP_HINT}`;

/** One fixed message for every problem (missing or malformed): it must not reveal which variables or values exist. */
export function loadAwsConfig(env: Record<string, string | undefined> = process.env): AwsConfig {
  const roleArn = (env.METAMORPH_AWS_ROLE_ARN ?? '').trim();
  const externalId = (env.METAMORPH_AWS_EXTERNAL_ID ?? '').trim();
  if (!ROLE_ARN_RE.test(roleArn) || !EXTERNAL_ID_RE.test(externalId)) throw new CloudError(NOT_CONFIGURED);
  const configured = (env.METAMORPH_AWS_REGIONS ?? '').trim();
  let regions: string[];
  if (configured) {
    regions = configured.split(',').map((r) => r.trim());
  } else {
    const home = (env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? 'us-east-1').trim();
    regions = [home, 'us-east-1'];
  }
  regions = [...new Set(regions)];
  if (regions.length === 0 || regions.length > MAX_REGIONS || regions.some((r) => !REGION_RE.test(r))) throw new CloudError(NOT_CONFIGURED);
  return { roleArn, externalId, regions };
}

/** '****1234': the last four digits of the account id in the role ARN, nothing else. */
export function accountHint(roleArn: string): string {
  const m = roleArn.match(ROLE_ARN_RE);
  return m ? `****${m[1].slice(-4)}` : '****';
}

const ACCESS_KEY_ID_RE = /\b(?:AKIA|ASIA|AIDA|AROA|AGPA|ANPA|ANVA|APKA)[A-Z0-9]{16}\b/g;
const SECRET_KEY_RE = /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+]{40}(?![A-Za-z0-9/+=])/g;
const LONG_TOKEN_RE = /[A-Za-z0-9/+=_-]{100,}/g;
const ACCOUNT_RE = /(?<!\d)\d{12}(?!\d)/g;
const CONTROL_RE = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u2069\\ufeff]', 'g');

/**
 * Removes access key ids, secret keys, session tokens, 12-digit account ids and any known secret value from text,
 * then strips control characters. `known` are exact values (secret key, token, external id, role arn) to cut out first.
 */
export function scrubAws(text: string, known: readonly string[] = []): string {
  let t = String(text);
  for (const k of known) if (k && k.length >= 4) t = t.split(k).join('[redacted]');
  t = t.replace(LONG_TOKEN_RE, '[token]').replace(ACCESS_KEY_ID_RE, '[key-id]').replace(SECRET_KEY_RE, '[secret]').replace(ACCOUNT_RE, '[account]');
  t = redact(t).text;
  return t.replace(CONTROL_RE, ' ').replace(/\s+/g, ' ').trim();
}

/** Untrusted AWS text (names, tags): control characters out, scrubbed, capped. */
export function cleanAwsText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const t = scrubAws(value);
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

const CODE_RE = /^[A-Za-z][A-Za-z0-9_.:-]{1,63}$/;

/** The AWS error CODE only (for example AccessDenied or ExpiredToken); never the message. */
export function errorCode(e: unknown): string {
  if (e instanceof CloudError && e.code) return e.code;
  const o = (e ?? {}) as Record<string, unknown>;
  for (const c of [o.name, o.Code, o.code]) {
    if (typeof c === 'string' && c !== 'Error' && c !== 'UnknownError' && CODE_RE.test(c) && scrubAws(c) === c) return c;
  }
  return 'Error';
}
