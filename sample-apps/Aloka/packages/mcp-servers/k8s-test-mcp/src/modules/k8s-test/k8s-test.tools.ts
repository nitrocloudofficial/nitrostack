import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { K8sTestService } from './k8s-test.service.js';

const k8sTestService = new K8sTestService();

export class K8sTestTools {
  constructor() {}

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
    return await k8sTestService.runSuite(args.suite_name, args.patch_diff, args.target_namespace);
  }

  @Tool({
    name: 'get_test_execution_status',
    description: 'Polls running Testkube execution status',
    inputSchema: z.object({ run_id: z.string() })
  })
  async getTestExecutionStatus(args: { run_id: string }) {
    return await k8sTestService.getStatus(args.run_id);
  }
}
