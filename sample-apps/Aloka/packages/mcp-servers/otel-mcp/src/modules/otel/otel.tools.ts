import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { OTelService } from './otel.service.js';

export class OTelTools {
  constructor(private readonly otelService: OTelService) {}

  // ─── Existing tools (Tempo backend) ────────────────────────────────────────

  @Tool({
    name: 'get_trace_spans',
    description: 'Filter spans by trace ID to extract root-cause error details from Grafana Tempo',
    inputSchema: z.object({
      trace_id: z.string(),
      filter_status: z.enum(['ALL', 'ERROR']).default('ERROR')
    })
  })
  async getTraceSpans(args: { trace_id: string, filter_status: 'ALL' | 'ERROR' }) {
    const spans = await this.otelService.fetchTraceSpans(args.trace_id, args.filter_status);
    return spans.length > 4000 ? spans.substring(0, 4000) : spans;
  }

  @Tool({
    name: 'get_service_dependency_graph',
    description: 'Maps upstream callers and downstream targets involved in a failed transaction',
    inputSchema: z.object({ trace_id: z.string() })
  })
  async getServiceDependencyGraph(args: { trace_id: string }) {
    return await this.otelService.fetchServiceDependencyGraph(args.trace_id);
  }

  // ─── New tools (local OTel log file) ───────────────────────────────────────

  @Tool({
    name: 'extract_trace_id',
    description:
      'Extract the first W3C traceparent (00-<traceId>-<spanId>-<flags>) or B3/Zipkin ' +
      'X-B3-TraceId from an arbitrary log string. Returns the 32-char hex trace ID or an empty ' +
      'string if none found. Use this on CI log output before calling get_trace_context.',
    inputSchema: z.object({
      log_text: z.string().describe('Raw CI log text or any string that may contain a traceparent header')
    })
  })
  async extractTraceId(args: { log_text: string }) {
    const traceId = this.otelService.extractTraceIdFromText(args.log_text);
    return traceId ?? '';
  }

  @Tool({
    name: 'get_trace_context',
    description:
      'Read a local OpenTelemetry `.txt` log file and return a structured LLM-ready summary of ' +
      'all spans matching the given trace ID. Surfaces error spans, service call chain, and ' +
      'root-cause candidates. Supports OTLP JSON-line and key=value log formats. ' +
      'Set OTEL_LOG_FILE env var or pass log_file_path explicitly.',
    inputSchema: z.object({
      trace_id:      z.string().describe('32-char hex trace ID to filter spans by'),
      log_file_path: z.string().optional().describe(
        'Absolute path to the local OTel .txt log file. Defaults to OTEL_LOG_FILE env var.'
      )
    })
  })
  async getTraceContext(args: { trace_id: string; log_file_path?: string }) {
    const filePath = args.log_file_path ?? process.env.OTEL_LOG_FILE ?? '';
    if (!filePath) {
      return '[ERROR] No log file path provided. Set OTEL_LOG_FILE or pass log_file_path.';
    }
    return this.otelService.parseLocalOtelLog(filePath, args.trace_id);
  }
}

