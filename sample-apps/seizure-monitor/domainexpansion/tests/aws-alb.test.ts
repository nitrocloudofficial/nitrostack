import { describe, it, expect } from 'vitest';
import { parseAwsAlbLogFormat } from '../src/engine/adapters/aws-alb.js';

describe('parseAwsAlbLogFormat', () => {
  it('parses a canonical ALB access log line (AWS documentation example)', () => {
    const line = 'https 2018-11-30T22:23:00.186641Z app/my-loadbalancer/50dc6c495c0c9188 192.168.131.39:2817 10.0.0.1:80 0.000 0.001 0.000 200 200 34 366 "GET https://www.example.com:443/ HTTP/1.1" "curl/7.46.0" ECDHE-RSA-AES128-GCM-SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067 "Root=1-58337364-23a8c76965a2ef7629b185e3" "www.example.com" "arn:aws:acm:us-east-2:123456789012:certificate/12345678-1234-1234-1234-123456789012" 1 2018-11-30T22:22:48.364000Z "forward" "-" "-" "10.0.0.1:80" "200" "-" "-"';
    const { records, rejected } = parseAwsAlbLogFormat(line);
    expect(rejected).toEqual({ count: 0, reasons: [] });
    expect(records).toHaveLength(1);
    const r = records[0];
    expect(r.id).toBe('L000001');
    expect(r.method).toBe('GET');
    expect(r.path).toBe('/');
    expect(r.query).toBeNull();
    expect(r.status).toBe(200);
    expect(r.ip).toBe('192.168.131.39');
    expect(r.actor).toEqual({ sub: null, role: null });
    expect(r.ua).toBe('curl/7.46.0');
    expect(r.respBytes).toBe(366);
    expect(r.latencyMs).toBe(1); // 0.000 + 0.001 + 0.000 seconds
    expect(r.ts).toBe('2018-11-30T22:23:00.186Z');
  });

  it('extracts path and query from the full request URL', () => {
    const line = 'https 2024-01-01T00:00:00.000000Z elb/x 10.0.0.1:1234 10.0.0.2:80 0.001 0.002 0.000 200 200 10 20 "GET https://api.example.com/search?q=pizza&limit=10 HTTP/1.1" "curl/8.0" - - arn:x "Root=1" "api.example.com" "-" 1 2024-01-01T00:00:00.000000Z "forward" "-" "-" "10.0.0.2:80" "200" "-" "-"';
    const { records } = parseAwsAlbLogFormat(line);
    expect(records[0].path).toBe('/search');
    expect(records[0].query).toBe('q=pizza&limit=10');
  });

  it('falls back to elb_status_code when target_status_code is "-" (target never responded)', () => {
    const line = 'https 2024-01-01T00:00:00.000000Z elb/x 10.0.0.1:1234 - -1 -1 -1 503 - 0 0 "GET https://api.example.com/a HTTP/1.1" "-" - - arn:x "Root=1" "api.example.com" "-" 1 2024-01-01T00:00:00.000000Z "forward" "-" "TargetNotResponding" "-" "-" "-" "-"';
    const { records, rejected } = parseAwsAlbLogFormat(line);
    expect(rejected).toEqual({ count: 0, reasons: [] });
    expect(records[0].status).toBe(503);
    // negative processing times (ALB error sentinel) are excluded from the latency sum
    expect(records[0].latencyMs).toBe(0);
  });

  it('actor is always null — an ALB has no application-level identity concept', () => {
    const line = 'https 2024-01-01T00:00:00.000000Z elb/x 10.0.0.1:1234 10.0.0.2:80 0.001 0.001 0.001 200 200 10 20 "GET https://api.example.com/a HTTP/1.1" "-" - - arn:x "Root=1" "api.example.com" "-" 1 2024-01-01T00:00:00.000000Z "forward" "-" "-" "10.0.0.2:80" "200" "-" "-"';
    const { records } = parseAwsAlbLogFormat(line);
    expect(records[0].actor).toEqual({ sub: null, role: null });
  });

  it('rejects a line with too few fields, reporting a reason, without throwing', () => {
    const line = 'https 2024-01-01T00:00:00.000000Z elb/x';
    const { records, rejected } = parseAwsAlbLogFormat(line);
    expect(records).toHaveLength(0);
    expect(rejected.count).toBe(1);
    expect(rejected.reasons[0]).toMatch(/expected at least 13 fields/);
  });

  it('rejects a line with an unrecognised HTTP method', () => {
    const line = 'https 2024-01-01T00:00:00.000000Z elb/x 10.0.0.1:1234 10.0.0.2:80 0.001 0.001 0.001 200 200 10 20 "TRACE https://api.example.com/a HTTP/1.1" "-" - - arn:x "Root=1" "api.example.com" "-" 1 2024-01-01T00:00:00.000000Z "forward" "-" "-" "10.0.0.2:80" "200" "-" "-"';
    const { records, rejected } = parseAwsAlbLogFormat(line);
    expect(records).toHaveLength(0);
    expect(rejected.count).toBe(1);
    expect(rejected.reasons[0]).toMatch(/unrecognised HTTP method/);
  });

  it('never throws on garbage input, including empty string', () => {
    expect(() => parseAwsAlbLogFormat('')).not.toThrow();
    expect(() => parseAwsAlbLogFormat('not an alb log line')).not.toThrow();
    expect(() => parseAwsAlbLogFormat('{"json": true}')).not.toThrow();
  });

  it('is deterministic — same input twice produces identical output', () => {
    const line = 'https 2018-11-30T22:23:00.186641Z app/x 192.168.131.39:2817 10.0.0.1:80 0.000 0.001 0.000 200 200 34 366 "GET https://www.example.com/ HTTP/1.1" "curl/7.46.0" - - arn:x "Root=1" "www.example.com" "-" 1 2018-11-30T22:22:48.364000Z "forward" "-" "-" "10.0.0.1:80" "200" "-" "-"';
    expect(parseAwsAlbLogFormat(line)).toEqual(parseAwsAlbLogFormat(line));
  });

  it('assigns sequential deterministic ids honoring idPrefix', () => {
    const line1 = 'https 2024-01-01T00:00:00.000000Z elb/x 10.0.0.1:1234 10.0.0.2:80 0.001 0.001 0.001 200 200 10 20 "GET https://api.example.com/a HTTP/1.1" "-" - - arn:x "Root=1" "api.example.com" "-" 1 2024-01-01T00:00:00.000000Z "forward" "-" "-" "10.0.0.2:80" "200" "-" "-"';
    const line2 = 'https 2024-01-01T00:00:01.000000Z elb/x 10.0.0.1:1234 10.0.0.2:80 0.001 0.001 0.001 200 200 10 20 "GET https://api.example.com/b HTTP/1.1" "-" - - arn:x "Root=1" "api.example.com" "-" 1 2024-01-01T00:00:01.000000Z "forward" "-" "-" "10.0.0.2:80" "200" "-" "-"';
    const { records } = parseAwsAlbLogFormat([line1, line2].join('\n'), 'B');
    expect(records.map((r) => r.id)).toEqual(['B000001', 'B000002']);
  });
});
