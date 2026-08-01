// Grok uses the OpenAI tool format

export const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_cluster_state',
      description:
        'Snapshot of the live cluster: nodes, deployments with replicas, resource requests, and estimated hourly cost (INR).',
      parameters: {
        type: 'object',
        properties: {
          namespace: { type: 'string', description: 'Kubernetes namespace (default: shop)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_pod_health',
      description: 'Per-pod phase, readiness, and restart counts for a namespace.',
      parameters: {
        type: 'object',
        properties: {
          namespace: { type: 'string', description: 'Kubernetes namespace (default: shop)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_disruption_safety',
      description:
        'Read the LIVE PodDisruptionBudget status and evaluate whether scaling to a target replica count is safe.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Deployment name' },
          namespace: { type: 'string', description: 'Kubernetes namespace' },
          targetReplicas: { type: 'number', description: 'Desired replica count' },
        },
        required: ['name', 'targetReplicas'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'scale_deployment',
      description:
        'Scale a deployment. SAFETY-ENFORCED: server re-reads the live PDB and policy floor and REJECTS any unsafe scale-down.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Deployment name' },
          namespace: { type: 'string', description: 'Kubernetes namespace' },
          replicas: { type: 'number', description: 'Target replica count' },
          rationale: { type: 'string', description: 'Why this scaling action' },
          proposedBy: {
            type: 'string',
            description: 'Who proposed: FinOpsAgent, AvailabilityGuardian, or Operator',
          },
        },
        required: ['name', 'replicas', 'rationale'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'rollback_deployment',
      description: 'Roll a deployment back to its previous revision.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Deployment name' },
          namespace: { type: 'string', description: 'Kubernetes namespace' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cordon_node',
      description: 'Mark a node unschedulable. SAFETY-ENFORCED: refuses if it would strand all workloads.',
      parameters: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name' },
          rationale: { type: 'string', description: 'Why cordoning this node' },
        },
        required: ['node', 'rationale'],
      },
    },
  },
];