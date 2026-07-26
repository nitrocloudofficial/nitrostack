import { Injectable } from '@nitrostack/core';
import { Sanitizer } from '@omnitrace/sanitizer';

@Injectable()
export class K8sTestService {
  private get baseUrl() {
    const url = process.env.TESTKUBE_URL;
    if (!url) throw new Error("Missing TESTKUBE_URL environment variable");
    return url;
  }

  private get authHeaders(): Record<string, string> {
    const token = process.env.TESTKUBE_API_TOKEN;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async runSuite(suite: string, diff: string, ns: string): Promise<string> {
    try {
      // Trigger a Testkube Test Suite Execution
      const response = await fetch(`${this.baseUrl}/v1/testsuites/${suite}/executions`, {
        method: 'POST',
        headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespace: ns,
          variables: {
            PATCH_DIFF: {
              name: "PATCH_DIFF",
              value: diff,
              type: "basic"
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return Sanitizer.scrub(`[SUCCESS] Started test suite execution. Run ID: ${data.id}`);
    } catch (e: any) {
      return `[ERROR] Testkube API failed to run suite: ${e.message}`;
    }
  }

  public async getStatus(runId: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/testsuite-executions/${runId}`, {
        headers: this.authHeaders
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Status could be passed, failed, running, queued, etc.
      return Sanitizer.scrub(`Test run ${runId}: ${data.status}`);
    } catch (e: any) {
      return `[ERROR] Testkube API failed to get status: ${e.message}`;
    }
  }
}
