export interface Cluster {
  id: string;
  region: string;
  status: 'healthy' | 'halted' | 'isolated';
  queue_length: number;
  active_deployments: string[];
  prioritized_branches?: Array<{ branch_id: string; urgency_level: string; prioritized_at: string }>;
}

export interface Threat {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_node: string;
}

export interface Ledger {
  department: string;
  budget: number;
  burn_rate: number;
  floor: number;
}

export interface Contract {
  cluster_id: string;
  customer: string;
  penalty_clause_inr: number;
  deadline: string;
}

export interface PendingAction {
  id: string;
  tool_name: string;
  params: Record<string, unknown>;
  briefing_text: string;
  conflict: ConflictResult | null;
  timestamp: string;
}

export interface ConflictResult {
  has_conflict: boolean;
  conflict_type: string;
  message: string;
}

export interface DeploymentMetrics {
  error_rate: number;
  latency_p99: number;
}

export interface Deployment {
  id: string;
  service_id: string;
  cluster_id: string;
  image_tag: string;
  strategy: string;
  traffic_pct: number;
  phase: string;
  metrics: DeploymentMetrics;
  status: 'active' | 'complete' | 'rolled_back';
  started_at: string;
}

export interface AppState {
  devops: { clusters: Cluster[]; deployments: Deployment[] };
  secops: { threats: Threat[]; isolated_nodes?: Array<{ node_id: string; isolated_at: string }> };
  finops: { ledgers: Ledger[]; contracts: Contract[] };
  iam: { active_session: { role: string; name: string } };
  weather: { last_fetched: string | null; risk_signal: string | null; condition?: string };
  pending_actions: PendingAction[];
}

const state: AppState = {
  devops: {
    clusters: [
      { id: 'PROD-01',    region: 'Chennai DC',   status: 'healthy', queue_length: 2, active_deployments: ['payments-service', 'checkout-service'] },
      { id: 'PROD-02',    region: 'Chennai DC',   status: 'healthy', queue_length: 0, active_deployments: ['api-gateway', 'auth-service'] },
      { id: 'STAGING-01', region: 'Chennai DC',   status: 'healthy', queue_length: 0, active_deployments: ['canary-staging'] },
      { id: 'PROD-03',    region: 'Mumbai DC',    status: 'healthy', queue_length: 1, active_deployments: ['inventory-service', 'search-service'] },
      { id: 'EU-WEST-01', region: 'Frankfurt DC', status: 'healthy', queue_length: 0, active_deployments: ['eu-gateway', 'gdpr-compliance-service'] }
    ],
    deployments: []
  },
  secops: {
    threats: [
      { id: 'THR-01', severity: 'low',    description: 'Unpatched dependency in staging',              affected_node: 'PROD-02' },
      { id: 'THR-02', severity: 'medium', description: 'Anomalous outbound traffic from search-service', affected_node: 'PROD-03' }
    ]
  },
  finops: {
    ledgers: [
      { department: 'Engineering', budget: 500000, burn_rate: 12000, floor: 100000 },
      { department: 'Security',    budget: 150000, burn_rate: 8000,  floor: 20000  },
      { department: 'UI/Design',   budget: 80000,  burn_rate: 3000,  floor: 10000  }
    ],
    contracts: [
      { cluster_id: 'PROD-01', customer: 'Acme Corp', penalty_clause_inr: 40000, deadline: '2026-07-18T18:00:00Z' }
    ]
  },
  iam: { active_session: { role: 'CISO', name: 'Demo User' } },
  weather: { last_fetched: null, risk_signal: null },
  pending_actions: []
};

export const getState  = () => state;
export const getDevops = () => state.devops;
export const getSecops = () => state.secops;
export const getFinops = () => state.finops;
export const getIam    = () => state.iam;
export const getWeather = () => state.weather;

export function setWeather(data: { condition: string; risk: string }) {
  state.weather = { risk_signal: data.risk, condition: data.condition, last_fetched: new Date().toISOString() };
}

export function haltCluster(clusterId: string) {
  const c = state.devops.clusters.find(c => c.id === clusterId);
  if (c) { c.status = 'halted'; c.active_deployments = []; }
}

export function reallocateCapital(sourceDept: string, targetDept: string, amount: number) {
  const src = state.finops.ledgers.find(l => l.department === sourceDept);
  const tgt = state.finops.ledgers.find(l => l.department === targetDept);
  if (src && tgt) { src.budget -= amount; tgt.budget += amount; }
}

export function prioritizeBranch(branchId: string, urgencyLevel: string) {
  state.devops.clusters.forEach(c => {
    if (!c.prioritized_branches) c.prioritized_branches = [];
    c.prioritized_branches.push({ branch_id: branchId, urgency_level: urgencyLevel, prioritized_at: new Date().toISOString() });
  });
}

export function isolateNode(nodeId: string) {
  state.devops.clusters.forEach(c => { if (c.id === nodeId) c.status = 'isolated'; });
  if (!state.secops.isolated_nodes) state.secops.isolated_nodes = [];
  const alreadyIsolated = state.secops.isolated_nodes.some(n => n.node_id === nodeId);
  if (!alreadyIsolated) {
    state.secops.isolated_nodes.push({ node_id: nodeId, isolated_at: new Date().toISOString() });
  }
}

export function addPendingAction(action: PendingAction) { state.pending_actions.push(action); }
export function removePendingAction(id: string) { state.pending_actions = state.pending_actions.filter(a => a.id !== id); }
export function getPendingAction(id: string) { return state.pending_actions.find(a => a.id === id); }

export function addDeployment(dep: Deployment) { state.devops.deployments.push(dep); }
export function updateDeployment(id: string, patch: Partial<Deployment>) {
  const dep = state.devops.deployments.find(d => d.id === id);
  if (dep) Object.assign(dep, patch);
}
export function removeDeployment(id: string) {
  state.devops.deployments = state.devops.deployments.filter(d => d.id !== id);
}
export function getDeployment(id: string) { return state.devops.deployments.find(d => d.id === id); }
