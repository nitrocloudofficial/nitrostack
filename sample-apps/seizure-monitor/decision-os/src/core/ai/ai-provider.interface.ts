export interface AIProviderHealth {
  provider: string;
  model: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  latencyMs: number;
  error?: string;
}

export interface AIProvider {
  /**
   * Generates structured JSON matching a specified schema.
   */
  generateStructuredJson<T>(
    prompt: string,
    systemInstruction: string,
    schema: Record<string, any>
  ): Promise<T>;

  /**
   * Performs a lightweight health check on the AI provider.
   */
  healthCheck(): Promise<AIProviderHealth>;
}
