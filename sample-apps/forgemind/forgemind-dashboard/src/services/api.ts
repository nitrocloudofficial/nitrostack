/**
 * ForgeMind Backend API & WebSocket Service Integration Module
 * Connects Harini's React Frontend with Nethra & Sahaan's NitroStack MCP Server & Orchestrator.
 */

export interface InjectFaultRequest {
  machineId: string;
  sensor: string;
  value: number;
  scenarioId?: string;
}

export interface McpToolCallRequest {
  toolName: string;
  args: Record<string, any>;
}

export class ForgeMindApiService {
  private baseUrl: string;
  private wsUrl: string;
  private socket: WebSocket | null = null;

  constructor(
    baseUrl = import.meta.env.VITE_API_URL || 'https://nitro-1-wpyf.onrender.com',
    wsUrl = import.meta.env.VITE_WS_URL || 'wss://nitro-1-wpyf.onrender.com/ws'
  ) {
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
  }

  // Check health status of Nethra's NitroStack MCP Server
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  // Trigger Fault Injection on Backend (Triggers Nethra's correlation_filter & orchestrator)
  async injectFault(payload: InjectFaultRequest): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/simulate-fault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  // Call NitroStack MCP Tool Directly
  async callMcpTool(toolName: string, args: Record<string, any>): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/mcp/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName, args }),
    });
    return res.json();
  }

  // Fetch Live Machines from MongoDB (Sandy's seeded dataset)
  async fetchMachines(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/machines`);
    return res.json();
  }

  // Fetch real PLC Scenarios from backend
  async getScenarios(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/scenarios`);
      return res.json();
    } catch {
      return [];
    }
  }

  // Trigger real PLC Scenario against AI Orchestrator
  async simulatePlcEvent(payload: Record<string, any>): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/simulate-plc-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  // Connect to WebSocket Bus for Live Agent Verification Steps
  connectWebSocket(
    onMessage: (data: any) => void,
    onError?: (err: Event) => void
  ): WebSocket {
    this.socket = new WebSocket(this.wsUrl);

    this.socket.onopen = () => {
      console.log('⚡ Connected to NitroStack MCP WebSocket Event Bus');
    };

    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage(parsed);
      } catch {
        onMessage(event.data);
      }
    };

    if (onError) this.socket.onerror = onError;

    return this.socket;
  }

  disconnectWebSocket() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const apiService = new ForgeMindApiService();
