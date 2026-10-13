import {
  ExecutionContext,
  ResourceDecorator as Resource,
} from '@nitrostack/core';
import { SURGEGUARD_CONTRACT } from '../../contracts/surgeguard-contract.js';
import { resourceSnapshot } from './surgeguard.runtime.js';

const RESOURCE_DESCRIPTIONS: Record<string, string> = {
  'surgeguard://health': 'Redacted health projection for the MCP server and operational dependencies.',
  'surgeguard://incidents/active': 'Tenant-scoped list of active emergency surge incidents.',
  'surgeguard://facilities/{facility_id}/capacity/current': 'Current licensed, staffed and operational capacity by location.',
  'surgeguard://facilities/{facility_id}/queues/current': 'Current queue pressure, service-level breaches and wait distribution.',
  'surgeguard://incidents/{incident_id}/action-plan': 'Read-only incident action plan projection for the current operational period.',
  'surgeguard://plans/{candidate_plan_id}': 'Candidate plan actions, allocations, scores and approval state.',
  'surgeguard://plans/{candidate_plan_id}/policy-gate': 'Rule-level evidence, violations and exception state for a candidate plan.',
  'surgeguard://executions/{plan_execution_id}': 'Plan execution steps, deviations, observed metrics and rollback readiness.',
};

const MVP_RESOURCE_URIS = new Set([
  'surgeguard://incidents/active',
]);

export class SurgeGuardResources {}

for (const [index, contract] of SURGEGUARD_CONTRACT.resources
  .filter((resource) => MVP_RESOURCE_URIS.has(resource.uri))
  .entries()) {
  const methodName = `resource_${index}_${contract.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')}`;

  const handler = async (uri: string, context: ExecutionContext) => {
    context.logger.info('Reading SurgeGuard resource', { uri });
    return {
      contents: [
        {
          uri,
          mimeType: contract.mimeType,
          text: JSON.stringify(resourceSnapshot(uri), null, 2),
        },
      ],
    };
  };

  Object.defineProperty(SurgeGuardResources.prototype, methodName, {
    value: handler,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  const descriptor = Object.getOwnPropertyDescriptor(
    SurgeGuardResources.prototype,
    methodName,
  )!;

  Resource({
    uri: contract.uri,
    name: contract.name,
    title: contract.name,
    description: RESOURCE_DESCRIPTIONS[contract.uri] ?? contract.name,
    mimeType: contract.mimeType,
    annotations: {
      audience: ['user', 'assistant'],
      priority: contract.uri.includes('policy-gate') ? 1 : 0.8,
    },
    metadata: {
      cacheable: true,
      cacheMaxAge: contract.uri.includes('/current') ? 30 : 120,
    },
  })(SurgeGuardResources.prototype, methodName, descriptor);
}
