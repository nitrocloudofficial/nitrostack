import { Module } from '@nitrostack/core';
import { K8sTestTools } from './k8s-test.tools.js';
import { K8sTestService } from './k8s-test.service.js';

@Module({
  name: 'k8s-test',
  description: 'Kubernetes ephemeral testing MCP server',
  controllers: [K8sTestTools],
  providers: [K8sTestService]
})
export class K8sTestModule {}
