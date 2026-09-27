import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';

/**
 * Python API Health Check
 * 
 * Verifies connectivity to the Python Flask Attendance API running on http://localhost:5000
 */
@HealthCheck({
  name: 'python-api',
  description: 'Python Flask Attendance API connectivity check',
  interval: 15
})
export class ApiHealthCheck implements HealthCheckInterface {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.PYTHON_API_URL || 'http://localhost:5000';
  }

  async check(): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`${this.apiUrl}/`, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          status: 'up',
          message: 'Python API is online and responding',
          details: {
            url: this.apiUrl,
            response: data,
          },
        };
      }

      return {
        status: 'degraded',
        message: `Python API returned HTTP status ${response.status}`,
        details: { url: this.apiUrl },
      };
    } catch (error: any) {
      return {
        status: 'down',
        message: 'Python API is offline or unreachable',
        details: {
          url: this.apiUrl,
          error: error.message || 'Connection refused',
        },
      };
    }
  }
}
