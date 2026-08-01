import { Module } from '@nitrostack/core';
import { AgentApiKeyGuard } from '../../guards/agent-api-key.guard.js';
import { AuditLogService } from './audit-log.service.js';
import { ComputeBackendService } from './compute-backend.service.js';
import { ComputePrompts } from './compute.prompts.js';
import { ComputeResources } from './compute.resources.js';
import { ComputeService } from './compute.service.js';
import { ComputeTools } from './compute.tools.js';
import { DockerComputeProvider } from './docker-compute.provider.js';
import { PolicyService } from './policy.service.js';
import { ProcessComputeProvider } from './process-compute.provider.js';
import { RuntimeRegistryService } from './runtime-registry.service.js';
import { StateStoreService } from './state-store.service.js';

@Module({
  name: 'compute',
  description: 'Policy-mediated, negotiated compute capabilities for AI agents.',
  controllers: [ComputeTools, ComputeResources, ComputePrompts],
  providers: [
    PolicyService,
    StateStoreService,
    RuntimeRegistryService,
    DockerComputeProvider,
    ProcessComputeProvider,
    ComputeBackendService,
    AuditLogService,
    ComputeService,
    AgentApiKeyGuard,
  ],
})
export class ComputeModule {}
