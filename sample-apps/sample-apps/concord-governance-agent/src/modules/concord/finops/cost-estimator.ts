import { AppState } from '../../../state/state.js';

export interface CostEstimate {
  hourly_impact_inr: number;
  risk_label: string;
  sla_exposure_inr?: number;
  sla_customer?: string;
  hours_remaining?: number;
  rightsizing_savings_monthly?: number;
  src_runway_months?: number;
  tgt_runway_months?: number;
  note?: string;
}

export function estimateCost(toolName: string, params: Record<string, any>, state: AppState): CostEstimate | null {
  const { devops, secops, finops } = state;
  const engLedger = finops.ledgers.find(l => l.department === 'Engineering');
  const hourlyBurn = engLedger ? Math.round(engLedger.burn_rate / (30 * 24)) : 0;

  if (toolName === 'halt_deployment_pipeline') {
    const contract = finops.contracts.find(c => c.cluster_id === params.cluster_id);
    const result: CostEstimate = { hourly_impact_inr: hourlyBurn, risk_label: 'HIGH' };
    if (contract) {
      result.sla_exposure_inr = contract.penalty_clause_inr;
      result.sla_customer = contract.customer;
      result.hours_remaining = Math.max(0, Math.round((new Date(contract.deadline).getTime() - Date.now()) / 3600000));
    }
    result.rightsizing_savings_monthly = Math.round(hourlyBurn * 24 * 30 * 0.40);
    return result;
  }

  if (toolName === 'reallocate_capital') {
    const src = finops.ledgers.find(l => l.department === params.source_dept);
    const tgt = finops.ledgers.find(l => l.department === params.target_dept);
    const srcRunway = src ? Math.floor((src.budget - params.amount - src.floor) / src.burn_rate) : 0;
    const tgtRunway = tgt ? Math.floor((tgt.budget + params.amount - tgt.floor) / tgt.burn_rate) : 0;
    return { hourly_impact_inr: 0, src_runway_months: srcRunway, tgt_runway_months: tgtRunway, risk_label: srcRunway < 3 ? 'HIGH' : 'MEDIUM' };
  }

  if (toolName === 'deploy_canary') {
    return { hourly_impact_inr: Math.round(hourlyBurn * 0.15), risk_label: 'LOW', note: 'Canary overhead ~15% during progressive rollout (~8 min)' };
  }

  if (toolName === 'isolate_compromised_node') {
    const threat = secops.threats.find(t => t.affected_node === params.node_id);
    return {
      hourly_impact_inr: devops.clusters.find(c => c.id === params.node_id) ? hourlyBurn : 0,
      risk_label: threat?.severity === 'critical' ? 'CRITICAL' : 'HIGH',
      note: 'Traffic disruption during isolation. Restored on threat clearance.'
    };
  }

  return null;
}

export function formatCostSection(cost: CostEstimate | null): string {
  if (!cost) return '';
  const lines = ['\nFINANCIAL IMPACT:'];
  if (cost.hourly_impact_inr > 0) lines.push(`  Cost impact: ₹${cost.hourly_impact_inr.toLocaleString('en-IN')}/hr`);
  if (cost.sla_exposure_inr) lines.push(`  SLA exposure: ₹${cost.sla_exposure_inr.toLocaleString('en-IN')} (${cost.sla_customer}, ${cost.hours_remaining}h remaining)`);
  if (cost.rightsizing_savings_monthly) lines.push(`  Rightsizing opportunity: ₹${cost.rightsizing_savings_monthly.toLocaleString('en-IN')}/mo (cluster over-provisioned ~40%)`);
  if (cost.src_runway_months !== undefined) {
    lines.push(`  Source dept runway after reallocation: ${cost.src_runway_months}mo`);
    lines.push(`  Target dept runway after reallocation: ${cost.tgt_runway_months}mo`);
  }
  if (cost.note) lines.push(`  Note: ${cost.note}`);
  lines.push(`  Risk classification: ${cost.risk_label}`);
  return lines.join('\n');
}
