/**
 * Project Aegis — NitroStack MCP Cloud & Local Connection Client
 * Manages HTTP/SSE JSON-RPC 2.0 communication with the NitroStack MCP Server.
 * Supports automatic fallback between Localhost (port 3001) and NitroCloud endpoints.
 */

export interface TelemetryData {
  timestamp: string;
  system_status: 'NOMINAL' | 'ANOMALY_DETECTED' | 'REMEDIATING' | 'RECOVERED';
  telemetry_analysis: {
    normalized_vector: [number, number, number, number];
    svd_residual_norm: number;
    is_warmup_period: boolean;
  };
  forensic_justification: string;
  orchestration_plan: Array<{
    step: number;
    target_agent: string;
    action: string;
    parameters: Record<string, unknown>;
  }>;
}

export interface SwarmEvent {
  time: string;
  source: string;
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export function getDefaultMcpUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3001/mcp';
    }
  }
  return 'https://agentic-6a6551d9-hashwins-org-0dcc4106.app.nitrocloud.ai/mcp';
}

export class AegisMcpClient {
  private primaryUrl: string;
  private fallbackUrl: string;
  private activeUrl: string;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private onStatusChange?: (status: boolean) => void;

  constructor(serverUrl?: string, onStatusChange?: (status: boolean) => void) {
    this.primaryUrl = serverUrl || getDefaultMcpUrl();
    this.fallbackUrl = this.primaryUrl.includes('localhost')
      ? 'https://agentic-6a6551d9-hashwins-org-0dcc4106.app.nitrocloud.ai/mcp'
      : 'http://localhost:3001/mcp';
    this.activeUrl = this.primaryUrl;
    this.onStatusChange = onStatusChange;
  }

  /**
   * Internal fetch executor with automatic URL failover
   */
  private async executeFetch(body: object): Promise<Response> {
    try {
      const res = await fetch(this.activeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) return res;
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      // Try fallback URL if primary fails
      const alternate = this.activeUrl === this.primaryUrl ? this.fallbackUrl : this.primaryUrl;
      const res = await fetch(alternate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        this.activeUrl = alternate; // Switch active URL on successful fallback
        return res;
      }
      throw err;
    }
  }

  /**
   * Executes an MCP Tool call over standard HTTP/JSON-RPC 2.0
   */
  async callTool<T = any>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    try {
      const response = await this.executeFetch({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name, arguments: args }
      });

      const json = await response.json();
      
      if (json.error) {
        throw new Error(`MCP Error ${json.error.code}: ${json.error.message}`);
      }

      this.setConnectedStatus(true);
      return json.result as T;
    } catch (err: any) {
      console.warn(`[MCP-CLIENT] Tool call '${name}' failed:`, err?.message || err);
      this.setConnectedStatus(false);
      this.scheduleReconnect();
      throw err;
    }
  }

  /**
   * Reads an MCP Resource by URI
   */
  async readResource<T = any>(uri: string): Promise<T> {
    try {
      const response = await this.executeFetch({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'resources/read',
        params: { uri }
      });

      const json = await response.json();
      this.setConnectedStatus(true);

      const contentText = json.result?.contents?.[0]?.text;
      return contentText ? JSON.parse(contentText) : json.result;
    } catch (err: any) {
      this.setConnectedStatus(false);
      this.scheduleReconnect();
      throw err;
    }
  }

  private setConnectedStatus(status: boolean) {
    if (this.isConnected !== status) {
      this.isConnected = status;
      this.onStatusChange?.(status);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.readResource('health://checks').catch(() => {});
    }, 3000);
  }
}
