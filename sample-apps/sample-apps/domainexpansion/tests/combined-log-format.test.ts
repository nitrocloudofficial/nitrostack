import { describe, it, expect } from 'vitest';
import { parseCombinedLogFormat } from '../src/engine/adapters/combined-log-format.js';

describe('parseCombinedLogFormat', () => {
  it('parses a canonical Apache combined-format line', () => {
    const line = '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pub/image.gif HTTP/1.0" 200 2326 "http://www.example.com/start.html" "Mozilla/4.08 [en] (Win98; I ;Nav)"';
    const { records, rejected } = parseCombinedLogFormat(line);
    expect(rejected).toEqual({ count: 0, reasons: [] });
    expect(records).toHaveLength(1);
    const r = records[0];
    expect(r.id).toBe('L000001');
    expect(r.method).toBe('GET');
    expect(r.path).toBe('/apache_pub/image.gif');
    expect(r.query).toBeNull();
    expect(r.status).toBe(200);
    expect(r.respBytes).toBe(2326);
    expect(r.ip).toBe('127.0.0.1');
    expect(r.actor).toEqual({ sub: 'frank', role: null });
    expect(r.ua).toBe('Mozilla/4.08 [en] (Win98; I ;Nav)');
    expect(r.latencyMs).toBe(0);
    // 10/Oct/2000:13:55:36 -0700 -> 20:55:36 UTC
    expect(r.ts).toBe('2000-10-10T20:55:36.000Z');
  });

  it('splits a query string out of the request target', () => {
    const line = '10.0.0.5 - - [01/Jan/2024:00:00:00 +0000] "GET /search?q=pizza&limit=10 HTTP/1.1" 200 512 "-" "curl/8.0"';
    const { records } = parseCombinedLogFormat(line);
    expect(records[0].path).toBe('/search');
    expect(records[0].query).toBe('q=pizza&limit=10');
  });

  it('treats "-" authuser as unauthenticated (null sub)', () => {
    const line = '10.0.0.5 - - [01/Jan/2024:00:00:00 +0000] "GET /a HTTP/1.1" 200 100 "-" "-"';
    const { records } = parseCombinedLogFormat(line);
    expect(records[0].actor).toEqual({ sub: null, role: null });
  });

  it('treats "-" bytes as 0', () => {
    const line = '10.0.0.5 - - [01/Jan/2024:00:00:00 +0000] "GET /a HTTP/1.1" 304 - "-" "-"';
    const { records } = parseCombinedLogFormat(line);
    expect(records[0].respBytes).toBe(0);
  });

  it('parses Common Log Format (no referer/user-agent quoted fields)', () => {
    const line = '145.24.1.2 - - [09/Oct/1995:00:00:01 -0400] "GET /shuttle/missions/sts-68/sts-68-patch-small.gif HTTP/1.0" 200 1713';
    const { records, rejected } = parseCombinedLogFormat(line);
    expect(rejected).toEqual({ count: 0, reasons: [] });
    expect(records).toHaveLength(1);
    expect(records[0].ua).toBe('');
    expect(records[0].method).toBe('GET');
    expect(records[0].status).toBe(200);
    expect(records[0].respBytes).toBe(1713);
  });

  it('rejects a line with an unrecognised HTTP method, reporting a reason', () => {
    const line = '10.0.0.5 - - [01/Jan/2024:00:00:00 +0000] "TRACE /a HTTP/1.1" 200 100 "-" "-"';
    const { records, rejected } = parseCombinedLogFormat(line);
    expect(records).toHaveLength(0);
    expect(rejected.count).toBe(1);
    expect(rejected.reasons[0]).toMatch(/unrecognised HTTP method/);
  });

  it('rejects a structurally malformed line without throwing', () => {
    const line = 'this is not a log line at all';
    const { records, rejected } = parseCombinedLogFormat(line);
    expect(records).toHaveLength(0);
    expect(rejected.count).toBe(1);
  });

  it('never throws on garbage input, including empty string', () => {
    expect(() => parseCombinedLogFormat('')).not.toThrow();
    expect(() => parseCombinedLogFormat('\n\n\n')).not.toThrow();
    expect(() => parseCombinedLogFormat('{"not": "a log line"}')).not.toThrow();
  });

  it('caps reported rejection reasons at 3 but counts all rejects', () => {
    const badLines = Array.from({ length: 10 }, () => 'garbage').join('\n');
    const { records, rejected } = parseCombinedLogFormat(badLines);
    expect(records).toHaveLength(0);
    expect(rejected.count).toBe(10);
    expect(rejected.reasons.length).toBe(3);
  });

  it('assigns sequential deterministic ids across multiple lines, honoring idPrefix', () => {
    const lines = [
      '10.0.0.1 - - [01/Jan/2024:00:00:00 +0000] "GET /a HTTP/1.1" 200 10 "-" "-"',
      '10.0.0.2 - - [01/Jan/2024:00:00:01 +0000] "GET /b HTTP/1.1" 200 10 "-" "-"',
    ].join('\n');
    const { records } = parseCombinedLogFormat(lines, 'X');
    expect(records.map((r) => r.id)).toEqual(['X000001', 'X000002']);
  });

  it('is deterministic — same input twice produces identical output', () => {
    const line = '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /a HTTP/1.0" 200 100 "-" "ua"';
    expect(parseCombinedLogFormat(line)).toEqual(parseCombinedLogFormat(line));
  });
});
