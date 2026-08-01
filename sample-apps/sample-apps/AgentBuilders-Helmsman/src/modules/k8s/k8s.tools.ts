import { ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';
import { core, apps, policy } from './client.js';
import { OPS_POLICY, fqName } from './policy.data.js';
import { evaluateScale } from './safety.js';
import { recordAction, getActionLog } from './audit.js';

function cpuToVcpu(req?: string): number {
  if (!req) return 0;
  return req.endsWith('m') ? parseInt(req) / 1000 : parseFloat(req);
}
function memToGiB(req?: string): number {
  if (!req) return 0;
  if (req.endsWith('Mi')) return parseInt(req) / 1024;
  if (req.endsWith('Gi')) return parseFloat(req);
  return 0;
}

export class K8sTools {
  @Tool({
    name: 'get_cluster_state',
    description:
      'Snapshot of the live cluster: nodes, and every deployment with replicas, resource requests, ' +
      'and estimated hourly cost (INR) from requested CPU/memory x replicas. The FinOps agent read.',
    inputSchema: z.object({ namespace: z.string().optional().default('shop') }),
  })
  async getClusterState(input: { namespace?: string }, ctx: ExecutionContext) {
    const ns = input.namespace ?? 'shop';
    const nodeList = await core.listNode();
    const depList = await apps.listNamespacedDeployment({ namespace: ns });

    const nodes = nodeList.items.map((n) => ({
      name: n.metadata?.name,
      unschedulable: n.spec?.unschedulable ?? false,
      allocatableCpu: n.status?.allocatable?.['cpu'],
      allocatableMem: n.status?.allocatable?.['memory'],
    }));

    const deployments = depList.items.map((d) => {
      const replicas = d.spec?.replicas ?? 0;
      const c = d.spec?.template?.spec?.containers?.[0];
      const vcpu = cpuToVcpu(c?.resources?.requests?.['cpu']);
      const gib = memToGiB(c?.resources?.requests?.['memory']);
      const costPerHr =
        replicas * (vcpu * OPS_POLICY.cost.inrPerVcpuHour + gib * OPS_POLICY.cost.inrPerGiBHour);
      return {
        name: d.metadata?.name,
        namespace: ns,
        replicas,
        readyReplicas: d.status?.readyReplicas ?? 0,
        requestPerPod: { vcpu, gib },
        estCostInrPerHr: Number(costPerHr.toFixed(2)),
        minReplicasPolicy: OPS_POLICY.minReplicas[fqName(ns, d.metadata?.name ?? '')] ?? 1,
      };
    });

    return { namespace: ns, nodes, deployments, totalDeployments: deployments.length };
  }

  @Tool({
    name: 'get_pod_health',
    description: 'Per-pod phase, readiness, and restart counts for a namespace — the availability read.',
    inputSchema: z.object({ namespace: z.string().optional().default('shop') }),
  })
  async getPodHealth(input: { namespace?: string }, ctx: ExecutionContext) {
    const ns = input.namespace ?? 'shop';
    const pods = await core.listNamespacedPod({ namespace: ns });
    return {
      namespace: ns,
      pods: pods.items.map((p) => ({
        name: p.metadata?.name,
        phase: p.status?.phase,
        ready: p.status?.conditions?.find((c) => c.type === 'Ready')?.status === 'True',
        restarts: p.status?.containerStatuses?.reduce((a, cs) => a + (cs.restartCount ?? 0), 0) ?? 0,
        node: p.spec?.nodeName,
      })),
    };
  }

  @Tool({
    name: 'check_disruption_safety',
    description:
      'Read the LIVE PodDisruptionBudget status for a deployment and evaluate whether scaling to a ' +
      'target replica count is safe. What the Availability Guardian calls before approving.',
    inputSchema: z.object({
      name: z.string(),
      namespace: z.string().optional().default('shop'),
      targetReplicas: z.number().int().min(0),
    }),
  })
  async checkDisruptionSafety(
    input: { name: string; namespace?: string; targetReplicas: number },
    ctx: ExecutionContext,
  ) {
    const ns = input.namespace ?? 'shop';
    const deploymentName = input.name ?? (input as any).deployment;
    if (!deploymentName) {
      return { ok: false, reason: 'Missing required parameter: name' };
    }
    const dep = await apps.readNamespacedDeployment({ name: deploymentName, namespace: ns });
    const current = dep.spec?.replicas ?? 0;

    const pdbs = await policy.listNamespacedPodDisruptionBudget({ namespace: ns });
    const appLabel = dep.spec?.selector?.matchLabels?.['app'];
    const pdb = pdbs.items.find((b) => b.spec?.selector?.matchLabels?.['app'] === appLabel);

    const decision = evaluateScale({
      currentReplicas: current,
      targetReplicas: input.targetReplicas,
      minReplicasPolicy: OPS_POLICY.minReplicas[fqName(ns, input.name)] ?? 1,
      pdbDesiredHealthy: pdb?.status?.desiredHealthy ?? 0,
      pdbDisruptionsAllowed: pdb?.status?.disruptionsAllowed ?? 0,
    });

    return {
      deployment: fqName(ns, input.name),
      currentReplicas: current,
      targetReplicas: input.targetReplicas,
      pdb: pdb
        ? {
            name: pdb.metadata?.name,
            desiredHealthy: pdb.status?.desiredHealthy,
            disruptionsAllowed: pdb.status?.disruptionsAllowed,
            currentHealthy: pdb.status?.currentHealthy,
          }
        : null,
      decision,
    };
  }

  @Tool({
    name: 'scale_deployment',
    description:
      'Scale a deployment. SAFETY-ENFORCED: server re-reads the live PDB and policy floor and REJECTS ' +
      'any scale-down that breaches them, regardless of caller. Read-modify-write on scale subresource.',
    inputSchema: z.object({
      name: z.string(),
      namespace: z.string().optional().default('shop'),
      replicas: z.number().int().min(0),
      rationale: z.string(),
      proposedBy: z.enum(['FinOpsAgent', 'AvailabilityGuardian', 'Operator']).default('FinOpsAgent'),
    }),
  })
  async scaleDeployment(
    input: {
      name: string;
      deployment?: string;
      namespace?: string;
      replicas: number;
      rationale: string;
      proposedBy?: 'FinOpsAgent' | 'AvailabilityGuardian' | 'Operator';
    },
    ctx: ExecutionContext,
  ) {
    const ns = input.namespace ?? 'shop';
    const deploymentName = input.name ?? (input as any).deployment ?? (input as any).service;
    if (!deploymentName) {
      return { ok: false, rejected: true, reason: 'Missing required parameter: name (deployment name)' };
    }
    // --- SAFETY GATE (real PDB, enforced in code) ---
    const safety = await this.checkDisruptionSafety(
      { name: deploymentName, namespace: ns, targetReplicas: input.replicas },
      ctx,
    );
    if ('ok' in safety) {
      return { ok: false, rejected: true, reason: safety.reason };
    }
    if (!safety.decision.allowed) {
      const rec = {
        timestamp: new Date().toISOString(),
        action: 'scale_deployment',
        target: fqName(ns, deploymentName),
        detail: { replicas: input.replicas, pdb: safety.pdb },
        proposedBy: input.proposedBy ?? 'FinOpsAgent',
        status: 'REJECTED' as const,
        reason: safety.decision.reason,
      };
      recordAction(rec);
      ctx.logger?.warn?.('scale REJECTED', rec);
      return { ok: false, rejected: true, reason: safety.decision.reason, safety };
    }

    // --- read-modify-write the scale subresource ---
    const scale = await apps.readNamespacedDeploymentScale({ name: deploymentName, namespace: ns });
    scale.spec = { replicas: input.replicas };
    await apps.replaceNamespacedDeploymentScale({ name: deploymentName, namespace: ns, body: scale });

    const rec = {
      timestamp: new Date().toISOString(),
      action: 'scale_deployment',
      target: fqName(ns, deploymentName),
      detail: { replicas: input.replicas, rationale: input.rationale },
      proposedBy: input.proposedBy ?? 'FinOpsAgent',
      status: 'EXECUTED' as const,
    };
    recordAction(rec);
    ctx.logger?.info?.('scale EXECUTED', rec);
    return { ok: true, scaledTo: input.replicas, auditLogSize: getActionLog().length };
  }

  @Tool({
    name: 'rollback_deployment',
    description: 'Roll a deployment back to its previous revision (equivalent to kubectl rollout undo).',
    inputSchema: z.object({ name: z.string(), namespace: z.string().optional().default('shop') }),
  })
  async rollbackDeployment(input: { name: string; namespace?: string }, ctx: ExecutionContext) {
    const ns = input.namespace ?? 'shop';
    const dep = await apps.readNamespacedDeployment({ name: input.name, namespace: ns });
    const selector = Object.entries(dep.spec?.selector?.matchLabels ?? {})
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    const rsList = await apps.listNamespacedReplicaSet({ namespace: ns, labelSelector: selector });
    const deploymentName = input.name ?? (input as any).deployment;
    if (!deploymentName) {
  return { ok: false, reason: 'Missing required parameter: name' };
}
    const owned = rsList.items
      .filter((rs) => rs.metadata?.ownerReferences?.some((o) => o.name === deploymentName))
      .sort(
        (a, b) =>
          Number(b.metadata?.annotations?.['deployment.kubernetes.io/revision'] ?? 0) -
          Number(a.metadata?.annotations?.['deployment.kubernetes.io/revision'] ?? 0),
      );
    const prev = owned[1];
    if (!prev?.spec?.template) return { ok: false, reason: 'No previous revision to roll back to.' };

    dep.spec!.template = prev.spec.template;
    await apps.replaceNamespacedDeployment({ name: input.name, namespace: ns, body: dep });

    recordAction({
      timestamp: new Date().toISOString(),
      action: 'rollback_deployment',
      target: fqName(ns, input.name),
      detail: { toRevision: prev.metadata?.annotations?.['deployment.kubernetes.io/revision'] },
      proposedBy: 'Operator',
      status: 'EXECUTED',
    });
    return { ok: true, rolledBackTo: prev.metadata?.annotations?.['deployment.kubernetes.io/revision'] };
  }

  @Tool({
    name: 'cordon_node',
    description: 'Mark a node unschedulable. SAFETY-ENFORCED: refuses if it would strand all workloads.',
    inputSchema: z.object({ node: z.string(), rationale: z.string() }),
  })
  async cordonNode(input: { node: string; rationale: string }, ctx: ExecutionContext) {
    const nodes = await core.listNode();
    const schedulable = nodes.items.filter((n) => !n.spec?.unschedulable);
    const already = nodes.items.find((n) => n.metadata?.name === input.node)?.spec?.unschedulable;
    if (schedulable.length <= 1 && !already) {
      const reason = 'VETO: cordoning the last schedulable node would strand all workloads.';
      recordAction({
        timestamp: new Date().toISOString(),
        action: 'cordon_node',
        target: input.node,
        detail: {},
        proposedBy: 'Operator',
        status: 'REJECTED',
        reason,
      });
      return { ok: false, rejected: true, reason };
    }
    const node = await core.readNode({ name: input.node });
    node.spec = { ...node.spec, unschedulable: true };
    await core.replaceNode({ name: input.node, body: node });
    recordAction({
      timestamp: new Date().toISOString(),
      action: 'cordon_node',
      target: input.node,
      detail: { rationale: input.rationale },
      proposedBy: 'Operator',
      status: 'EXECUTED',
    });
    return { ok: true, cordoned: input.node };
  }
}
