import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';

@HealthCheck({
  name: 'gemini',
  description: 'Validates that the GEMINI_API_KEY environment variable is configured for security review.',
  interval: 30
})
export class GeminiHealthCheck implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        status: 'degraded',
        message: 'GEMINI_API_KEY is not configured. Security review tools may be unavailable.',
        details: {
          missing: 'GEMINI_API_KEY'
        }
      };
    }

    return {
      status: 'up',
      message: 'Gemini API key is configured.'
    };
  }
}
