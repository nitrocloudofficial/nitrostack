import { Injectable } from '@nitrostack/core';
import { Sanitizer } from '@omnitrace/sanitizer';
import * as fs from 'fs';

// ─── Span record parsed from a local OTel log file ───────────────────────────

interface ParsedSpan {
  traceId:     string;
  spanId:      string;
  parentId:    string;
  serviceName: string;
  name:        string;
  status:      string;
  durationMs:  number;
  attributes:  Record<string, string>;
}

@Injectable()
export class OTelService {

  // ─── Tempo HTTP methods (kept for production backends) ─────────────────────

  private get baseUrl() {
    const url = process.env.TEMPO_URL;
    if (!url) throw new Error("Missing TEMPO_URL environment variable");
    return url;
  }

  private get authHeaders(): Record<string, string> {
    const token = process.env.TEMPO_API_TOKEN;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async fetchTraceSpans(traceId: string, filterStatus: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/traces/${traceId}`, {
        headers: this.authHeaders
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      let spans = data?.batches?.flatMap((b: any) =>
        b.instrumentationLibrarySpans?.flatMap((ils: any) => ils.spans)
      ) || [];

      if (filterStatus === 'ERROR') {
        spans = spans.filter((s: any) => s.status?.code === 'STATUS_CODE_ERROR');
      }

      return Sanitizer.scrub(JSON.stringify(spans, null, 2));
    } catch (e: any) {
      return `[ERROR] Tempo API failed to fetch trace spans: ${e.message}`;
    }
  }

  public async fetchServiceDependencyGraph(traceId: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/traces/${traceId}`, {
        headers: this.authHeaders
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const spans = data?.batches?.flatMap((b: any) =>
        b.instrumentationLibrarySpans?.flatMap((ils: any) => ils.spans)
      ) || [];

      const graph = { edges: spans.map((s: any) => ({ from: s.parentSpanId || 'root', to: s.spanId, name: s.name })) };
      return Sanitizer.scrub(JSON.stringify(graph, null, 2));
    } catch (e: any) {
      return `[ERROR] Tempo API failed to build dependency graph: ${e.message}`;
    }
  }

  public async fetchTraceWaterfall(traceId: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/traces/${traceId}`, {
        headers: this.authHeaders
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return Sanitizer.scrub(JSON.stringify(data, null, 2));
    } catch (e: any) {
      return `[ERROR] Tempo API failed to fetch waterfall: ${e.message}`;
    }
  }

  // ─── Local OTel log-file methods ───────────────────────────────────────────

  /**
   * Extract the first W3C traceparent trace-ID or B3/Zipkin X-B3-TraceId
   * found in an arbitrary text string (e.g. CI log output).
   *
   * Returns the 32-char lowercase hex trace ID, or null if none found.
   */
  public extractTraceIdFromText(text: string): string | null {
    // W3C traceparent: 00-<traceId(32 hex)>-<spanId(16 hex)>-<flags(2 hex)>
    const w3cMatch = text.match(/traceparent[=:\s"']+00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}/i);
    if (w3cMatch) return w3cMatch[1].toLowerCase();

    // Docker Compose OTel log format: "service  |   traceId: '32hex'"
    const dockerMatch = text.match(/traceId:\s*['"]([0-9a-f]{32})['"]/i);
    if (dockerMatch) return dockerMatch[1].toLowerCase();

    // B3 / Zipkin X-B3-TraceId: 64-bit (16 hex) or 128-bit (32 hex)
    const b3Match = text.match(/(?:x-b3-traceid|traceId)[=:\s"']+([0-9a-f]{16,32})/i);
    if (b3Match) return b3Match[1].toLowerCase().padStart(32, '0');

    // Bare "trace_id": "<32 hex>" key-value (common in structured log lines)
    const bareMatch = text.match(/trace[_-]?id[=:\s"']+([0-9a-f]{32})/i);
    if (bareMatch) return bareMatch[1].toLowerCase();

    return null;
  }

  /**
   * Read a local OTel `.txt` log file and return a structured summary of all
   * spans matching the given `traceId`.
   *
   * Supports two line formats automatically:
   *   1. OTLP JSON lines  — `{ "traceId": "...", "spanId": "...", ... }`
   *   2. Key=value lines  — `traceId=... spanId=... service.name=... ...`
   */
  public parseLocalOtelLog(logFilePath: string, traceId: string): string {
    if (!fs.existsSync(logFilePath)) {
      return `[ERROR] OTel log file not found: ${logFilePath}`;
    }

    const bomBytes = fs.readFileSync(logFilePath).slice(0, 2);
    const encoding: BufferEncoding =
      (bomBytes[0] === 0xFF && bomBytes[1] === 0xFE) ||
      (bomBytes[0] === 0xFE && bomBytes[1] === 0xFF)
        ? 'utf16le' : 'utf8';
    const raw = fs.readFileSync(logFilePath, encoding).replace(/^\uFEFF/, ''); // strip BOM
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const spans: ParsedSpan[] = [];

    // ── Format 3: Docker Compose multi-line log ───────────────────────────────
    // Lines look like: "service  |   traceId: '282cab...'" spanning multiple lines per record.
    // Detect by checking if the file contains this pattern.
    const isDockerComposeFmt = lines.some(l => /^\S.*\s+\|\s+/.test(l));
    if (isDockerComposeFmt) {
      return this._parseDockerComposeLog(lines, traceId);
    }

    for (const line of lines) {
      try {
        // ── Format 1: JSON line ───────────────────────────────────────────────
        if (line.trimStart().startsWith('{')) {
          const obj = JSON.parse(line);
          const id = (obj.traceId ?? obj.trace_id ?? '').toLowerCase().replace(/-/g, '');
          if (!id.includes(traceId.replace(/-/g, '').toLowerCase())) continue;

          spans.push({
            traceId:     id,
            spanId:      obj.spanId ?? obj.span_id ?? '',
            parentId:    obj.parentSpanId ?? obj.parent_id ?? '',
            serviceName: obj['service.name'] ?? obj.serviceName ?? obj.resource?.attributes?.['service.name'] ?? 'unknown',
            name:        obj.name ?? obj.operationName ?? '',
            status:      obj.status?.code ?? obj.statusCode ?? 'UNSET',
            durationMs:  obj.durationMs ?? (obj.endTimeUnixNano && obj.startTimeUnixNano
              ? Math.round((Number(obj.endTimeUnixNano) - Number(obj.startTimeUnixNano)) / 1e6)
              : 0),
            attributes:  obj.attributes ?? {},
          });
          continue;
        }

        // ── Format 2: key=value line ──────────────────────────────────────────
        const id = this._kvGet(line, ['traceId', 'trace_id']).toLowerCase().replace(/-/g, '');
        if (!id || !id.includes(traceId.replace(/-/g, '').toLowerCase())) continue;

        spans.push({
          traceId:     id,
          spanId:      this._kvGet(line, ['spanId', 'span_id']),
          parentId:    this._kvGet(line, ['parentSpanId', 'parent_id', 'parentId']),
          serviceName: this._kvGet(line, ['service.name', 'serviceName', 'service']),
          name:        this._kvGet(line, ['name', 'operationName', 'operation']),
          status:      this._kvGet(line, ['status', 'statusCode', 'status.code']) || 'UNSET',
          durationMs:  Number(this._kvGet(line, ['durationMs', 'duration_ms'])) || 0,
          attributes:  {},
        });
      } catch {
        // skip unparseable lines silently
      }
    }

    if (spans.length === 0) {
      return `[INFO] No spans found for traceId=${traceId} in ${logFilePath}`;
    }

    const errorSpans = spans.filter(s =>
      s.status === 'STATUS_CODE_ERROR' || s.status === 'ERROR' || s.status === '2'
    );

    const lines2: string[] = [
      `## OTel Trace Summary`,
      `Trace ID : ${traceId}`,
      `Total spans: ${spans.length}  |  Error spans: ${errorSpans.length}`,
      '',
      '### Error Spans',
    ];

    (errorSpans.length ? errorSpans : spans).slice(0, 20).forEach(s => {
      lines2.push(
        `- [${s.serviceName}] ${s.name} | spanId=${s.spanId} parentId=${s.parentId || 'root'} ` +
        `status=${s.status} duration=${s.durationMs}ms`
      );
    });

    lines2.push('', '### Service Call Chain');
    const byService: Record<string, string[]> = {};
    for (const s of spans) {
      (byService[s.serviceName] ??= []).push(`  • ${s.name} (${s.durationMs}ms, ${s.status})`);
    }
    for (const [svc, ops] of Object.entries(byService)) {
      lines2.push(`**${svc}**`);
      lines2.push(...ops.slice(0, 10));
    }

    const result = lines2.join('\n');
    const trimmed = result.length > 3800 ? result.substring(0, 3800) + '\n...[truncated]' : result;
    return Sanitizer.scrub(trimmed);
  }

  /** Extract value for the first matching key in a `key=value` log line. */
  private _kvGet(line: string, keys: string[]): string {
    for (const key of keys) {
      const m = line.match(new RegExp(`(?:^|\\s)${key.replace('.', '\\.')}=([^\\s,]+)`));
      if (m) return m[1].replace(/^["']|["']$/g, '');
    }
    return '';
  }

  /**
   * Parse Docker Compose multi-line OTel log format.
   * Each record is a JS object printed across ~40 lines, prefixed with "service  |".
   * We group consecutive lines into records delimited by the top-level `{` / `}` pair,
   * then extract fields with regex.
   */
  private _parseDockerComposeLog(lines: string[], traceId: string): string {
    // Strip prefix: "payment  |   traceId: ..." → "  traceId: ..."
    const stripped = lines.map(l => l.replace(/^\S[\w-]*\s*\|\s?/, ''));

    // Group into records by top-level { ... }
    const records: string[][] = [];
    let current: string[] = [];
    let depth = 0;
    for (const line of stripped) {
      const opens  = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;
      if (depth === 0 && opens > 0) {
        current = [line];
        depth += opens - closes;
        if (depth === 0) { records.push(current); current = []; }
      } else if (depth > 0) {
        current.push(line);
        depth += opens - closes;
        if (depth <= 0) { records.push(current); current = []; depth = 0; }
      }
    }

    // Filter records matching traceId
    const targetId = traceId.replace(/-/g, '').toLowerCase();
    const matched = records.filter(r =>
      r.some(l => {
        const m = l.match(/traceId:\s*['"]([0-9a-f]{32})['"]/);
        return m && m[1].toLowerCase() === targetId;
      })
    );

    if (matched.length === 0) {
      return `[INFO] No log records found for traceId=${traceId}`;
    }

    // Extract fields from each matched record block
    const getField = (block: string[], ...keys: string[]): string => {
      for (const key of keys) {
        for (const line of block) {
          const m = line.match(new RegExp(`${key}:\\s*['"]?([^,'"\\n{}\\[\\]]+)['"]?`));
          if (m) return m[1].trim();
        }
      }
      return '';
    };

    const spans: Array<{
      traceId: string; spanId: string; severity: string;
      body: string; service: string;
    }> = matched.map(block => ({
      traceId:  getField(block, 'traceId'),
      spanId:   getField(block, 'spanId'),
      severity: getField(block, 'severityText'),
      body:     getField(block, 'body'),
      service:  getField(block, "'service\\.name'", 'service\.name'),
    }));

    const errors = spans.filter(s =>
      s.severity === 'error' || s.severity === 'ERROR' || s.severity === 'warn'
    );

    const out: string[] = [
      `## OTel Trace Summary (Docker Compose logs)`,
      `Trace ID : ${traceId}`,
      `Matching log records: ${spans.length}  |  Error/Warn records: ${errors.length}`,
      '',
      `### Log Records`,
    ];

    (errors.length ? errors : spans).slice(0, 20).forEach(s => {
      out.push(`- [${s.service || 'unknown'}] ${s.body} | spanId=${s.spanId} severity=${s.severity}`);
    });

    out.push('', '### All Messages');
    spans.slice(0, 30).forEach(s => {
      out.push(`  • [${s.severity}] ${s.body}`);
    });

    const result = out.join('\n');
    const trimmed = result.length > 3800 ? result.substring(0, 3800) + '\n...[truncated]' : result;
    return Sanitizer.scrub(trimmed);
  }
}

