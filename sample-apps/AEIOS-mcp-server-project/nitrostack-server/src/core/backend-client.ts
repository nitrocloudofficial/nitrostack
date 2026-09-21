import 'dotenv/config';

export interface BackendChatResponse {
  success: boolean;
  response: string;
  metadata: Record<string, unknown>;
}

export interface BackendHealthResponse {
  status: string;
  version: string;
}

export class BackendClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.AEIOS_BACKEND_URL || 'http://127.0.0.1:8000';
  }

  async available(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async chat(query: string): Promise<BackendChatResponse> {
    const resp = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Backend returned ${resp.status}: ${text}`);
    }

    return resp.json() as Promise<BackendChatResponse>;
  }

  async pipelineExecute(query: string): Promise<BackendChatResponse> {
    const resp = await fetch(`${this.baseUrl}/pipeline/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Backend returned ${resp.status}: ${text}`);
    }

    return resp.json() as Promise<BackendChatResponse>;
  }

  async getStatus(): Promise<Record<string, unknown>> {
    const resp = await fetch(`${this.baseUrl}/pipeline/status`, {
      signal: AbortSignal.timeout(5000),
    });
    return resp.json() as Promise<Record<string, unknown>>;
  }

  async getHealth(): Promise<BackendHealthResponse> {
    const resp = await fetch(`${this.baseUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return resp.json() as Promise<BackendHealthResponse>;
  }

  async getVersion(): Promise<Record<string, unknown>> {
    const resp = await fetch(`${this.baseUrl}/`, {
      signal: AbortSignal.timeout(5000),
    });
    return resp.json() as Promise<Record<string, unknown>>;
  }
}
