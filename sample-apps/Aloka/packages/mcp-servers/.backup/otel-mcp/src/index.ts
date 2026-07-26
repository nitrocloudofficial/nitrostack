#!/usr/bin/env node
import { Module, ToolDecorator as Tool, ResourceDecorator as Resource, Injectable, McpApp, McpApplicationFactory, z } from '@nitrostack/core';
import { Sanitizer } from '@omnitrace/sanitizer';
import axios from 'axios';

@Injectable()
export class OTelService {
  private get baseUrl() {
    const url = process.env.TEMPO_URL;
    if (!url) throw new Error("Missing TEMPO_URL environment variable");
    return url;
  }

  private get authHeaders() {
    const token = process.env.TEMPO_API_TOKEN;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async fetchTraceSpans(traceId: string, filterStatus: string): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/traces/${traceId}`, {
        headers: this.authHeaders
      });
      // Tempo returns OpenTelemetry OTLP JSON format or similar depending on the exact endpoint.
      // We will assume a simplified JSON extraction of spans:
      let spans = response.data?.batches?.flatMap((b: any) => 
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
      // Typically, Tempo doesn't natively return a "graph", but we can build a simple one from the trace spans
      const response = await axios.get(`${this.baseUrl}/api/traces/${traceId}`, {
        headers: this.authHeaders
      });
      
      const spans = response.data?.batches?.flatMap((b: any) => 
        b.instrumentationLibrarySpans?.flatMap((ils: any) => ils.spans)
      ) || [];

      // A mock graph builder
      const graph = { edges: spans.map((s: any) => ({ from: s.parentSpanId || 'root', to: s.spanId, name: s.name })) };
      return Sanitizer.scrub(JSON.stringify(graph, null, 2));
    } catch (e: any) {
      return `[ERROR] Tempo API failed to build dependency graph: ${e.message}`;
    }
  }

  public async fetchTraceWaterfall(traceId: string): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/traces/${traceId}`, {
        headers: this.authHeaders
      });
      return Sanitizer.scrub(JSON.stringify(response.data, null, 2));
    } catch (e: any) {
      return `[ERROR] Tempo API failed to fetch waterfall: ${e.message}`;
    }
  }
}

@McpApp({ 
  module: OTelServer, 
  server: { name: 'otel-mcp', version: '1.0.0' },
  logging: { level: 'error' }
})
@Module({ 
  name: 'otel', 
  imports: [
    
  ],
  providers: [OTelService] 
})
export class OTelServer {
  constructor(private readonly otelService: OTelService) {}

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

  @Resource({
    name: 'trace_waterfall',
    uri: 'otel://traces/{trace_id}/waterfall',
    description: 'Structural JSON representation of the entire microservice call hierarchy'
  })
  async getTraceWaterfall(uri: string, params: { trace_id: string }) {
    return { contents: [{ uri, text: await this.otelService.fetchTraceWaterfall(params.trace_id) }] };
  }
}

async function bootstrap() {
  const server = await McpApplicationFactory.create(OTelServer);
  await server.start();
}
bootstrap().catch(console.error);
