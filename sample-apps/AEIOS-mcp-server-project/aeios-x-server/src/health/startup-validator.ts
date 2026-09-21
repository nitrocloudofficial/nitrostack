import { GroqClient } from '../llm/groq-client.js';

export interface ValidationResult {
  service: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

export class StartupValidator {
  async validateAll(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    results.push(this.checkEnvVars());
    results.push(await this.checkGroqApi());
    results.push(this.checkNodeVersion());
    results.push(this.checkMemory());

    return results;
  }

  private checkEnvVars(): ValidationResult {
    const required = ['GROQ_API_KEY'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      return { service: 'environment', status: 'error', message: `Missing: ${missing.join(', ')}` };
    }

    const optional = ['GROQ_MODEL', 'APP_ENV', 'LOG_LEVEL'];
    const missingOptional = optional.filter(key => !process.env[key]);

    if (missingOptional.length > 0) {
      return { service: 'environment', status: 'warning', message: `Optional missing: ${missingOptional.join(', ')} (using defaults)` };
    }

    return { service: 'environment', status: 'ok', message: 'All environment variables configured' };
  }

  private async checkGroqApi(): Promise<ValidationResult> {
    try {
      const client = new GroqClient();
      const available = await client.available();
      if (available) {
        return { service: 'groq-api', status: 'ok', message: 'Groq API connected successfully' };
      }
      return { service: 'groq-api', status: 'error', message: 'Groq API unreachable' };
    } catch {
      return { service: 'groq-api', status: 'error', message: 'Groq API connection failed' };
    }
  }

  private checkNodeVersion(): ValidationResult {
    const version = process.versions.node;
    const major = parseInt(version.split('.')[0]);
    if (major >= 18) {
      return { service: 'node-runtime', status: 'ok', message: `Node.js ${version}` };
    }
    return { service: 'node-runtime', status: 'warning', message: `Node.js ${version} (recommend 18+)` };
  }

  private checkMemory(): ValidationResult {
    const mem = process.memoryUsage();
    const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
    if (heapMB < 512) {
      return { service: 'memory', status: 'ok', message: `Heap: ${heapMB}MB` };
    }
    return { service: 'memory', status: 'warning', message: `High heap usage: ${heapMB}MB` };
  }
}
