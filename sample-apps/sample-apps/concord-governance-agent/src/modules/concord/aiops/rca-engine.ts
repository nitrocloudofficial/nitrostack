import { AppState, Threat } from '../../../state/state.js';

export interface RcaChainStep {
  node: string;
  event: string;
  severity: string;
}

export interface RcaResult {
  chain: RcaChainStep[];
  root_cause: string;
  recommended_action: string;
}

const FALLBACK_CHAINS: Record<string, (node: string) => RcaChainStep[]> = {
  low: (node) => [
    { node, event: 'Unpatched dependency detected', severity: 'low' },
    { node: 'API Gateway', event: 'Elevated error rate on dependent endpoints', severity: 'medium' },
    { node: 'Monitoring', event: 'SLA window at risk — anomaly alert triggered', severity: 'medium' }
  ],
  medium: (node) => [
    { node, event: 'Malicious payload detected', severity: 'medium' },
    { node: 'Service Mesh', event: 'Lateral movement attempt — mTLS blocking', severity: 'high' },
    { node: 'Auth Service', event: 'Token validation error spike', severity: 'high' },
    { node: 'API Gateway', event: '5xx responses rising — user impact imminent', severity: 'high' }
  ],
  high: (node) => [
    { node, event: 'Active exploit executing', severity: 'high' },
    { node: 'Service Mesh', event: 'East-west traffic anomaly — possible data exfiltration', severity: 'critical' },
    { node: 'Database Layer', event: 'Unauthorized read queries from compromised node', severity: 'critical' },
    { node: 'Perimeter', event: 'Egress to unknown IP — C2 callback suspected', severity: 'critical' }
  ],
  critical: (node) => [
    { node, event: 'Ransomware payload executing', severity: 'critical' },
    { node: 'Storage Layer', event: 'File encryption in progress — backups at risk', severity: 'critical' },
    { node: 'Service Mesh', event: 'All outbound traffic rerouted through malicious proxy', severity: 'critical' },
    { node: 'Recovery Systems', event: 'Backup access attempted — RTO/RPO objectives threatened', severity: 'critical' }
  ]
};

function buildFallbackRCA(threat: Threat): RcaResult {
  const fn = FALLBACK_CHAINS[threat.severity] || FALLBACK_CHAINS.medium;
  return {
    chain: fn(threat.affected_node),
    root_cause: `${threat.description} on ${threat.affected_node} — triggered by unresolved CVE in the dependency chain`,
    recommended_action: `isolate_compromised_node:${threat.affected_node}`
  };
}

export async function generateRCA(threat: Threat, state: AppState): Promise<RcaResult> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  if (!apiKey) return buildFallbackRCA(threat);

  const clusters = state.devops.clusters.map(c => `${c.id}:${c.status}`).join(', ');
  const otherThreats = state.secops.threats.filter(t => t.id !== threat.id).map(t => `${t.id}(${t.severity})`).join(', ') || 'none';

  const prompt = `You are an AIOps root cause analysis engine for a cloud infrastructure governance platform.

Incident:
- Threat ID: ${threat.id}
- Severity: ${threat.severity}
- Description: ${threat.description}
- Affected node: ${threat.affected_node}
- Cluster states: ${clusters}
- Other active threats: ${otherThreats}

Return ONLY a JSON object (no other text) showing the causality chain:
{
  "chain": [
    { "node": "node_name", "event": "what happened here", "severity": "critical|high|medium|low" }
  ],
  "root_cause": "One sentence root cause",
  "recommended_action": "governance action to take"
}

Include 3-4 chain steps showing how the failure propagated through the system.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 400, temperature: 0.3 })
    });
    const data: any = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('empty response');
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no JSON in response');
    return JSON.parse(match[0]);
  } catch (err: any) {
    console.error('[rca] Groq call failed, using fallback:', err.message);
    return buildFallbackRCA(threat);
  }
}
