/**
 * Adapter for Apache/nginx Combined Log Format (and its Common Log Format
 * subset) into AccessLogRecord — the single most widely emitted real-world
 * access-log format, still the default or an available option on Apache,
 * nginx, and most reverse proxies / CDNs that front them.
 *
 * Pure function, no I/O — belongs in the engine layer like every other
 * format-shape transform (templatise.ts, spec.ts), not src/integrations/
 * (which is reserved for actual network calls).
 *
 * Format (Apache "combined"):
 *   %h %l %u %t "%r" %>s %b "%{Referer}i" "%{User-Agent}i"
 * Example:
 *   127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /a?x=1 HTTP/1.0" 200 2326 "-" "curl/7.1"
 *
 * Honest limitations of this format, not papered over:
 *   - No latency field at all. latencyMs is always 0 for adapter-derived
 *     records. Checked: no detection rule reads latencyMs, so this doesn't
 *     skew any result — it's purely cosmetic in evidence display.
 *   - No structured "role" concept. actor.role is always null; only
 *     actor.sub (the %u field, from HTTP Basic Auth or a reverse-proxy
 *     auth module) is ever populated, and only when the server was
 *     configured to log it — most real deployments log "-" (anonymous)
 *     here even for authenticated requests, unless HTTP Basic Auth or an
 *     auth-proxy module specifically populates REMOTE_USER. R1_CROSS_ACTOR
 *     and R2_ENUMERATION, which key off actor.sub, will legitimately find
 *     nothing on logs where this field is always "-" — that's a real,
 *     structural gap in what this format can tell us, not a bug in the
 *     adapter or the rules.
 */

import type { AccessLogRecord, HttpMethod } from '../types.js';

const HTTP_METHODS = new Set<HttpMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// host ident authuser [timestamp] "request" status bytes ["referer" "user-agent"]
const LINE_PATTERN =
  /^(\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d{3}|-) (\d+|-)(?:\s+"([^"]*)"\s+"([^"]*)")?\s*$/;

/**
 * Parses an Apache-format timestamp ("10/Oct/2000:13:55:36 -0700") into an
 * ISO 8601 UTC string. Pure string parsing of a given value — not a clock
 * read, so this stays deterministic like the rest of the engine.
 */
function parseApacheTimestamp(raw: string): string | null {
  const match = raw.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/);
  if (!match) return null;
  const [, dayStr, monStr, yearStr, hStr, mStr, sStr, tzStr] = match;
  const month = MONTHS[monStr];
  if (month === undefined) return null;

  const day = Number(dayStr);
  const year = Number(yearStr);
  const hour = Number(hStr);
  const minute = Number(mStr);
  const second = Number(sStr);
  const tzSign = tzStr[0] === '-' ? -1 : 1;
  const tzHours = Number(tzStr.slice(1, 3));
  const tzMinutes = Number(tzStr.slice(3, 5));
  const offsetMinutes = tzSign * (tzHours * 60 + tzMinutes);

  const utcMs = Date.UTC(year, month, day, hour, minute, second) - offsetMinutes * 60_000;
  return new Date(utcMs).toISOString();
}

function splitPathAndQuery(target: string): { path: string; query: string | null } {
  const qIndex = target.indexOf('?');
  if (qIndex === -1) return { path: target, query: null };
  return { path: target.slice(0, qIndex), query: target.slice(qIndex + 1) };
}

export interface CombinedLogParseResult {
  records: AccessLogRecord[];
  rejected: { count: number; reasons: string[] };
}

/**
 * Parses a full Combined/Common Log Format file (one request per line) into
 * AccessLogRecord[]. Malformed lines are counted and reported, never thrown
 * — consistent with ingest_access_logs' own "accept the batch, report
 * rejects" contract.
 *
 * @param idPrefix Prefix for the generated deterministic ids (default "L"),
 *   matching the "L000001" convention evidence URIs already reference.
 */
export function parseCombinedLogFormat(text: string, idPrefix = 'L'): CombinedLogParseResult {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const records: AccessLogRecord[] = [];
  const reasons: string[] = [];
  let rejectedCount = 0;
  let nextId = 1;

  for (const [lineIndex, line] of lines.entries()) {
    const match = line.match(LINE_PATTERN);
    if (!match) {
      rejectedCount++;
      if (reasons.length < 3) reasons.push(`line ${lineIndex + 1}: does not match Combined/Common Log Format`);
      continue;
    }

    const [, host, , authuser, tsRaw, requestLine, statusRaw, bytesRaw, , userAgentRaw] = match;

    const ts = parseApacheTimestamp(tsRaw);
    if (ts === null) {
      rejectedCount++;
      if (reasons.length < 3) reasons.push(`line ${lineIndex + 1}: unparseable timestamp "${tsRaw}"`);
      continue;
    }

    const requestParts = requestLine.split(' ');
    if (requestParts.length < 2) {
      rejectedCount++;
      if (reasons.length < 3) reasons.push(`line ${lineIndex + 1}: malformed request line "${requestLine}"`);
      continue;
    }
    const [methodRaw, target] = requestParts;
    const method = methodRaw.toUpperCase();
    if (!HTTP_METHODS.has(method as HttpMethod)) {
      rejectedCount++;
      if (reasons.length < 3) reasons.push(`line ${lineIndex + 1}: unrecognised HTTP method "${methodRaw}"`);
      continue;
    }

    if (statusRaw === '-') {
      rejectedCount++;
      if (reasons.length < 3) reasons.push(`line ${lineIndex + 1}: no status code recorded`);
      continue;
    }

    const { path, query } = splitPathAndQuery(target);

    records.push({
      id: `${idPrefix}${String(nextId++).padStart(6, '0')}`,
      ts,
      method: method as HttpMethod,
      path,
      query,
      status: Number(statusRaw),
      actor: { sub: authuser === '-' ? null : authuser, role: null },
      ip: host,
      latencyMs: 0, // not available in this format — see file header
      respBytes: bytesRaw === '-' ? 0 : Number(bytesRaw),
      ua: userAgentRaw ?? '',
    });
  }

  return { records, rejected: { count: rejectedCount, reasons } };
}
