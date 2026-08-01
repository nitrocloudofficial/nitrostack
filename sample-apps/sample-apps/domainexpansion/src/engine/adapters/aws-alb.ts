/**
 * Adapter for AWS Application Load Balancer (ALB) access logs into
 * AccessLogRecord — the other extremely common real-world format alongside
 * Apache/nginx Combined Log Format (combined-log-format.ts), and a useful
 * contrast: ALB logs carry real request-latency data (Combined Log Format
 * has none at all) but never carry an application-level authenticated user
 * (Combined Log Format sometimes does, via %u) — an ALB operates below the
 * application, so it has no concept of who your app thinks is logged in.
 *
 * Pure function, no I/O — belongs in the engine layer like every other
 * format-shape transform, not src/integrations/.
 *
 * Format (space-separated, some fields double-quoted; field count and order
 * per AWS's documented ALB access log entry syntax):
 *   type time elb client:port target:port request_processing_time
 *   target_processing_time response_processing_time elb_status_code
 *   target_status_code received_bytes sent_bytes "request" "user_agent"
 *   ssl_cipher ssl_protocol target_group_arn "trace_id" "domain_name"
 *   "chosen_cert_arn" matched_rule_priority request_creation_time
 *   "actions_executed" "redirect_url" "error_reason" "target:port_list"
 *   "target_status_code_list" "classification" "classification_reason"
 *   [conn_trace_id]
 *
 * Honest limitations of this format, not papered over:
 *   - actor.sub is always null. An ALB sits in front of the application and
 *     has no notion of an authenticated principal — R1_CROSS_ACTOR and
 *     R2_ENUMERATION will legitimately find nothing on ALB-derived data,
 *     structurally, not as a bug.
 *   - actor.role is always null, same reason.
 *   - latencyMs IS available here (unlike Combined Log Format) — the sum of
 *     the three processing-time fields, converted from seconds to
 *     milliseconds.
 *   - status comes from target_status_code (what the application actually
 *     returned) when present; falls back to elb_status_code (e.g. when the
 *     target never responded and the ALB generated the status itself, such
 *     as a 5xx from an unhealthy target).
 */

import type { AccessLogRecord, HttpMethod } from '../types.js';

const HTTP_METHODS = new Set<HttpMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

/** Splits a line into tokens, treating a "..." run (with internal spaces) as one token. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    tokens.push(match[1] !== undefined ? match[1] : match[2]);
  }
  return tokens;
}

function splitPathAndQuery(target: string): { path: string; query: string | null } {
  const qIndex = target.indexOf('?');
  if (qIndex === -1) return { path: target, query: null };
  return { path: target.slice(0, qIndex), query: target.slice(qIndex + 1) };
}

/** Extracts just the path(+query) out of ALB's full-URL request target. */
function extractPathFromUrl(rawUrl: string): { path: string; query: string | null } | null {
  try {
    const url = new URL(rawUrl);
    return splitPathAndQuery(`${url.pathname}${url.search}`);
  } catch {
    // Not a full URL (some ALB entries log a bare path for HTTP/1.0-style requests) — treat as-is.
    if (rawUrl.startsWith('/')) return splitPathAndQuery(rawUrl);
    return null;
  }
}

export interface AlbLogParseResult {
  records: AccessLogRecord[];
  rejected: { count: number; reasons: string[] };
}

/**
 * Parses AWS ALB access log text (one request per line) into
 * AccessLogRecord[]. Malformed lines are counted and reported, never thrown.
 *
 * @param idPrefix Prefix for the generated deterministic ids (default "L").
 */
export function parseAwsAlbLogFormat(text: string, idPrefix = 'L'): AlbLogParseResult {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const records: AccessLogRecord[] = [];
  const reasons: string[] = [];
  let rejectedCount = 0;
  let nextId = 1;

  for (const [lineIndex, line] of lines.entries()) {
    const tokens = tokenize(line);
    if (tokens.length < 13) {
      rejectedCount++;
      if (reasons.length < 3) reasons.push(`line ${lineIndex + 1}: expected at least 13 fields, got ${tokens.length}`);
      continue;
    }

    const [
      , // type
      time,
      , // elb
      clientPort,
      , // target:port
      requestProcessingTime,
      targetProcessingTime,
      responseProcessingTime,
      elbStatusCode,
      targetStatusCode,
      , // received_bytes
      sentBytes,
      requestLine,
      userAgentRaw,
    ] = tokens;

    const tsMs = Date.parse(time);
    if (Number.isNaN(tsMs)) {
      rejectedCount++;
      if (reasons.length < 3) reasons.push(`line ${lineIndex + 1}: unparseable timestamp "${time}"`);
      continue;
    }

    const requestParts = requestLine.split(' ');
    if (requestParts.length < 2) {
      rejectedCount++;
      if (reasons.length < 3) reasons.push(`line ${lineIndex + 1}: malformed request field "${requestLine}"`);
      continue;
    }
    const [methodRaw, rawUrl] = requestParts;
    const method = methodRaw.toUpperCase();
    if (!HTTP_METHODS.has(method as HttpMethod)) {
      rejectedCount++;
      if (reasons.length < 3) reasons.push(`line ${lineIndex + 1}: unrecognised HTTP method "${methodRaw}"`);
      continue;
    }

    const pathAndQuery = extractPathFromUrl(rawUrl);
    if (pathAndQuery === null) {
      rejectedCount++;
      if (reasons.length < 3) reasons.push(`line ${lineIndex + 1}: unparseable request target "${rawUrl}"`);
      continue;
    }

    const statusStr = targetStatusCode !== '-' ? targetStatusCode : elbStatusCode;
    const status = Number(statusStr);
    if (statusStr === '-' || Number.isNaN(status)) {
      rejectedCount++;
      if (reasons.length < 3) reasons.push(`line ${lineIndex + 1}: no status code recorded`);
      continue;
    }

    const latencySeconds = [requestProcessingTime, targetProcessingTime, responseProcessingTime]
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v >= 0)
      .reduce((sum, v) => sum + v, 0);

    const ip = clientPort.includes(':') ? clientPort.slice(0, clientPort.lastIndexOf(':')) : clientPort;

    records.push({
      id: `${idPrefix}${String(nextId++).padStart(6, '0')}`,
      ts: new Date(tsMs).toISOString(),
      method: method as HttpMethod,
      path: pathAndQuery.path,
      query: pathAndQuery.query,
      status,
      actor: { sub: null, role: null }, // an ALB has no concept of an app-level authenticated user
      ip,
      latencyMs: Math.round(latencySeconds * 1000),
      respBytes: sentBytes === '-' ? 0 : Number(sentBytes) || 0,
      ua: userAgentRaw === '-' ? '' : userAgentRaw,
    });
  }

  return { records, rejected: { count: rejectedCount, reasons } };
}
