import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { core, apps, policy } from './client.js';
import { OPS_POLICY } from './policy.data.js';
import { getActionLog } from './audit.js';

export class K8sResources {
  @Resource({
    uri: 'k8s://cluster/topology',
    name: 'Cluster Topology',
    description: 'Live nodes, namespaces, and deployments — the shared map both agents reason over.',
    mimeType: 'application/json',
  })
  async topology(uri: string, _ctx: ExecutionContext) {
    const [nodes, deps] = await Promise.all([core.listNode(), apps.listDeploymentForAllNamespaces()]);
    const body = {
      nodes: nodes.items.map((n) => ({
        name: n.metadata?.name,
        unschedulable: n.spec?.unschedulable ?? false,
      })),
      deployments: deps.items.map((d) => ({
        name: d.metadata?.name,
        namespace: d.metadata?.namespace,
        replicas: d.spec?.replicas,
        ready: d.status?.readyReplicas,
      })),
    };
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(body, null, 2) }] };
  }

  @Resource({
    uri: 'k8s://policy/disruption-budgets',
    name: 'Disruption Budgets & Floors',
    description: 'Live PodDisruptionBudget status plus ops policy min-replica floors — the veto basis.',
    mimeType: 'application/json',
  })
  async budgets(uri: string, _ctx: ExecutionContext) {
    const pdbs = await policy.listPodDisruptionBudgetForAllNamespaces();
    const body = {
      policyFloors: OPS_POLICY.minReplicas,
      pdbs: pdbs.items.map((b) => ({
        name: b.metadata?.name,
        namespace: b.metadata?.namespace,
        minAvailable: b.spec?.minAvailable,
        desiredHealthy: b.status?.desiredHealthy,
        currentHealthy: b.status?.currentHealthy,
        disruptionsAllowed: b.status?.disruptionsAllowed,
      })),
    };
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(body, null, 2) }] };
  }

  @Resource({
    uri: 'k8s://actions/log',
    name: 'Remediation Audit Log',
    description: 'Append-only log of every executed and rejected action with rationale.',
    mimeType: 'application/json',
  })
  async actions(uri: string, _ctx: ExecutionContext) {
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(getActionLog(), null, 2) }],
    };
  }
}
