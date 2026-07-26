#!/usr/bin/env node
import { Module, ToolDecorator as Tool, Injectable, McpApp, McpApplicationFactory, z } from '@nitrostack/core';
import { Sanitizer } from '@omnitrace/sanitizer';
import axios from 'axios';

@Injectable()
export class K8sTestService {
  private get baseUrl() {
    const url = process.env.TESTKUBE_URL;
    if (!url) throw new Error("Missing TESTKUBE_URL environment variable");
    return url;
  }

  private get authHeaders() {
    const token = process.env.TESTKUBE_API_TOKEN;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  public async runSuite(suite: string, diff: string, ns: string): Promise<string> {
    try {
      // Trigger a Testkube Test Suite Execution
      const response = await axios.post(`${this.baseUrl}/v1/testsuites/${suite}/executions`, {
        namespace: ns,
        variables: {
          PATCH_DIFF: {
            name: "PATCH_DIFF",
            value: diff,
            type: "basic"
          }
        }
      }, {
        headers: this.authHeaders
      });

      return Sanitizer.scrub(`[SUCCESS] Started test suite execution. Run ID: ${response.data.id}`);
    } catch (e: any) {
      return `[ERROR] Testkube API failed to run suite: ${e.message}`;
    }
  }

  public async getStatus(runId: string): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/testsuite-executions/${runId}`, {
        headers: this.authHeaders
      });

      // Status could be passed, failed, running, queued, etc.
      return Sanitizer.scrub(`Test run ${runId}: ${response.data.status}`);
    } catch (e: any) {
      return `[ERROR] Testkube API failed to get status: ${e.message}`;
    }
  }
}

@McpApp({ 
  module: K8sTestServer, 
  server: { name: 'k8s-test-mcp', version: '1.0.0' },
  logging: { level: 'error' }
})
@Module({ 
  name: 'k8s-test', 
  imports: [
    
  ],
  providers: [K8sTestService] 
})
export class K8sTestServer {
  constructor(private readonly k8sTestService: K8sTestService) {}

  @Tool({
    name: 'run_ephemeral_test_suite',
    description: 'Execute targeted integration tests in an ephemeral K8s pod',
    inputSchema: z.object({
      suite_name: z.string(),
      patch_diff: z.string(),
      target_namespace: z.string().default('omnitrace-sandbox')
    })
  })
  async runEphemeralTestSuite(args: { suite_name: string, patch_diff: string, target_namespace: string }) {
    return await this.k8sTestService.runSuite(args.suite_name, args.patch_diff, args.target_namespace);
  }

  @Tool({
    name: 'get_test_execution_status',
    description: 'Polls running Testkube execution status',
    inputSchema: z.object({ run_id: z.string() })
  })
  async getTestExecutionStatus(args: { run_id: string }) {
    return await this.k8sTestService.getStatus(args.run_id);
  }
}

async function bootstrap() {
  const server = await McpApplicationFactory.create(K8sTestServer);
  await server.start();
}
bootstrap().catch(console.error);
