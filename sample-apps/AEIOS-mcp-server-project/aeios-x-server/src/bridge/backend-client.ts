export interface BackendConfig {
  baseUrl: string;
  timeout: number;
}

export class BackendClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config?: Partial<BackendConfig>) {
    this.baseUrl = config?.baseUrl || process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    this.timeout = config?.timeout || 30000;
  }

  async chat(message: string): Promise<Record<string, unknown>> {
    return this.post('/chat', { message });
  }

  async pipelineExecute(query: string): Promise<Record<string, unknown>> {
    return this.post('/pipeline/execute', { query });
  }

  async pipelineStatus(): Promise<Record<string, unknown>> {
    return this.get('/pipeline/status');
  }

  async pipelineReset(): Promise<Record<string, unknown>> {
    return this.post('/pipeline/reset', {});
  }

  async health(): Promise<Record<string, unknown>> {
    return this.get('/health');
  }

  async status(): Promise<Record<string, unknown>> {
    return this.get('/status');
  }

  async version(): Promise<Record<string, unknown>> {
    return this.get('/version');
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  private async get(path: string): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Backend responded with ${res.status}: ${res.statusText}`);
      }
      return await res.json() as Record<string, unknown>;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  private async post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Backend responded with ${res.status}: ${res.statusText}`);
      }
      return await res.json() as Record<string, unknown>;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}
