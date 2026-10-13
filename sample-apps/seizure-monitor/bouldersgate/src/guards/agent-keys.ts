/**
 * Agent credentials are one environment variable per calling agent, named for
 * the agent: `BOULDERSGATE_API_KEY_DEMO`, `BOULDERSGATE_API_KEY_CI`, and so on.
 * Each distinct key becomes a distinct agent identity and audit trail.
 *
 * `ApiKeyModule.getKeys()` cannot express that. It reads only `PREFIX_1`,
 * `PREFIX_2`, … stopping at the first gap, plus a bare `PREFIX` — so a named
 * suffix loads no key at all, and every request is denied with no indication
 * that the credential was never read. Collecting the keys here and handing them
 * to `forRoot({ keys })` keeps the naming the deployment actually uses.
 */

export const AGENT_KEY_PREFIX = 'BOULDERSGATE_API_KEY';

/**
 * The documented placeholders in `.env.example`. A deployment that copies the
 * example file without editing it would otherwise turn a value printed in a
 * public repository into a working credential — the whole key set is loaded by
 * prefix, and any non-empty string was previously accepted.
 *
 * These are rejected as if unset: an unconfigured server denies every request,
 * which is the correct failure direction. `MIN_AGENT_KEY_LENGTH` additionally
 * refuses values too short to be a real secret, so a stray `key=changeme`
 * cannot authenticate either.
 */
const PLACEHOLDER_MARKERS = ['replace-with', 'changeme', 'your-key', 'example'];
const MIN_AGENT_KEY_LENGTH = 16;

export function isPlaceholderKey(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    value.length < MIN_AGENT_KEY_LENGTH ||
    PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker))
  );
}

export function collectAgentKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  return Object.entries(env)
    .filter(([name]) => name.startsWith(AGENT_KEY_PREFIX))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => !isPlaceholderKey(value));
}
