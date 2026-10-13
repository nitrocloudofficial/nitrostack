import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import {
  getState, getIam,
  haltCluster, reallocateCapital, prioritizeBranch, isolateNode,
  addPendingAction, removePendingAction, getPendingAction,
  addDeployment, updateDeployment,
  PendingAction, ConflictResult
} from '../../state/state.js';
import { runConflictCheck, listRules } from './rules/rule-registry.js';
import './rules/governance-rules.js'; // side-effect: registers all rules
import { estimateCost, formatCostSection } from './finops/cost-estimator.js';
import { generateRCA } from './aiops/rca-engine.js';
import { startCanary } from './canary-engine.js';
import { writeAuditEntry, getAuditHistory, verifyChain } from './audit/hash-chain.js';

const CLUSTER_IDS = ['PROD-01', 'PROD-02', 'STAGING-01', 'PROD-03', 'EU-WEST-01'] as const;

function buildBriefing(toolName: string, params: Record<string, unknown>, conflict: ConflictResult | null): string {
  const role = getIam().active_session.role;
  const state = getState();
  let text = `Requested by: ${role}\nAction: ${toolName}(${JSON.stringify(params)})\n`;
  if (conflict?.has_conflict) {
    text += `\n⚠️  Conflict detected: ${conflict.message}`;
  }
  const cost = estimateCost(toolName, params, state);
  text += formatCostSection(cost);
  return text;
}

function makePendingAction(toolName: string, params: Record<string, unknown>, conflict: ConflictResult | null): PendingAction {
  return {
    id: `action-${Date.now()}`,
    tool_name: toolName,
    params,
    briefing_text: buildBriefing(toolName, params, conflict),
    conflict,
    timestamp: new Date().toISOString()
  };
}

export class ConcordTools {
  // ── High-risk tools ─────────────────────────────────────────────────────────

  @Tool({
    name: 'halt_deployment_pipeline',
    description: 'Halts a CI/CD deployment pipeline for a given cluster. HIGH RISK — queued for human approval. Always read finops://erp/department-ledgers.json first to check for active contracts on this cluster.',
    inputSchema: z.object({
      cluster_id:    z.enum(CLUSTER_IDS).describe('Target cluster'),
      severity_flag: z.enum(['low', 'medium', 'critical']).describe('Reason severity')
    })
  })
  async haltDeploymentPipeline(input: { cluster_id: string; severity_flag: string }, ctx: ExecutionContext) {
    const conflict = await runConflictCheck('halt_deployment_pipeline', input, getState());
    const action = makePendingAction('halt_deployment_pipeline', input as Record<string, unknown>, conflict);
    addPendingAction(action);

    ctx.logger.info('halt_deployment_pipeline queued for approval', { id: action.id, conflict: !!conflict });

    return {
      status: 'pending_approval',
      action_id: action.id,
      briefing: action.briefing_text,
      conflict: action.conflict,
      message: `Action queued. Call approve_action("${action.id}") to execute or deny_action("${action.id}") to cancel.`
    };
  }

  @Tool({
    name: 'reallocate_capital',
    description: 'Shifts budget between department ledgers. HIGH RISK — queued for human approval. Check the source department floor before proposing.',
    inputSchema: z.object({
      source_dept:   z.enum(['Engineering', 'Security', 'UI/Design']).describe('Source department'),
      target_dept:   z.enum(['Engineering', 'Security', 'UI/Design']).describe('Target department'),
      amount:        z.number().min(0).describe('Amount in INR to transfer'),
      justification: z.string().min(10).describe('Business justification')
    })
  })
  async reallocateCapital(input: { source_dept: string; target_dept: string; amount: number; justification: string }, ctx: ExecutionContext) {
    const conflict = await runConflictCheck('reallocate_capital', input, getState());
    const action = makePendingAction('reallocate_capital', input as Record<string, unknown>, conflict);
    addPendingAction(action);

    ctx.logger.info('reallocate_capital queued for approval', { id: action.id, conflict: !!conflict });

    return {
      status: 'pending_approval',
      action_id: action.id,
      briefing: action.briefing_text,
      conflict: action.conflict,
      message: `Action queued. Call approve_action("${action.id}") to execute or deny_action("${action.id}") to cancel.`
    };
  }

  @Tool({
    name: 'prioritize_engineering_branch',
    description: 'Escalates a codebase branch for immediate compute priority and human review. HIGH RISK — queued for human approval.',
    inputSchema: z.object({
      branch_id:     z.string().describe('Git branch identifier'),
      urgency_level: z.enum(['normal', 'high', 'critical']).describe('Escalation urgency')
    })
  })
  async prioritizeEngineeringBranch(input: { branch_id: string; urgency_level: string }, ctx: ExecutionContext) {
    const conflict = await runConflictCheck('prioritize_engineering_branch', input, getState());
    const action = makePendingAction('prioritize_engineering_branch', input as Record<string, unknown>, conflict);
    addPendingAction(action);

    return {
      status: 'pending_approval',
      action_id: action.id,
      briefing: action.briefing_text,
      conflict: action.conflict,
      message: `Action queued. Call approve_action("${action.id}") to execute or deny_action("${action.id}") to cancel.`
    };
  }

  @Tool({
    name: 'isolate_compromised_node',
    description: 'Quarantines a network node suspected of compromise. HIGH RISK — queued for human approval. Confirm the node is not serving live traffic first.',
    inputSchema: z.object({
      node_id: z.string().describe('Node or cluster ID to isolate')
    })
  })
  async isolateCompromisedNode(input: { node_id: string }, ctx: ExecutionContext) {
    const conflict = await runConflictCheck('isolate_compromised_node', input, getState());
    const action = makePendingAction('isolate_compromised_node', input as Record<string, unknown>, conflict);
    addPendingAction(action);

    return {
      status: 'pending_approval',
      action_id: action.id,
      briefing: action.briefing_text,
      conflict: action.conflict,
      message: `Action queued. Call approve_action("${action.id}") to execute or deny_action("${action.id}") to cancel.`
    };
  }

  @Tool({
    name: 'deploy_canary',
    description: 'Initiates a progressive canary deployment for a microservice using Argo Rollouts-style traffic splitting. HIGH RISK — queued for human approval. Automatically advances traffic from 10% → 100% in steps, with metric-driven auto-rollback if error_rate > 2% or latency_p99 > 800ms. Poll get_deployment_status to see progress.',
    inputSchema: z.object({
      service_id: z.string().describe('Service name to deploy (e.g. payments-service)'),
      cluster_id: z.enum(CLUSTER_IDS).describe('Target cluster'),
      image_tag:  z.string().describe('Docker image tag to deploy (e.g. v2.1.0)'),
      strategy:   z.enum(['canary', 'blue_green']).default('canary').describe('Deployment strategy')
    })
  })
  async deployCanary(input: { service_id: string; cluster_id: string; image_tag: string; strategy?: string }, ctx: ExecutionContext) {
    const conflict = await runConflictCheck('deploy_canary', input, getState());
    const action = makePendingAction('deploy_canary', input as Record<string, unknown>, conflict);
    addPendingAction(action);

    return {
      status: 'pending_approval',
      action_id: action.id,
      briefing: action.briefing_text,
      conflict: action.conflict,
      message: `Action queued. Call approve_action("${action.id}") to execute or deny_action("${action.id}") to cancel.`
    };
  }

  // ── Approval tools ───────────────────────────────────────────────────────────

  @Tool({
    name: 'approve_action',
    description: 'Approve a queued high-risk action and execute it against live state. Use the action_id returned by the originating tool call.',
    inputSchema: z.object({
      action_id: z.string().describe('The action_id returned by the high-risk tool call')
    })
  })
  async approveAction(input: { action_id: string }, ctx: ExecutionContext) {
    const action = getPendingAction(input.action_id);
    if (!action) return { status: 'error', message: `No pending action found with id ${input.action_id}` };

    const { tool_name, params } = action;
    let deploymentId: string | undefined;

    switch (tool_name) {
      case 'halt_deployment_pipeline':
        haltCluster(params.cluster_id as string);
        break;
      case 'reallocate_capital':
        reallocateCapital(params.source_dept as string, params.target_dept as string, params.amount as number);
        break;
      case 'prioritize_engineering_branch':
        prioritizeBranch(params.branch_id as string, params.urgency_level as string);
        break;
      case 'isolate_compromised_node':
        isolateNode(params.node_id as string);
        break;
      case 'deploy_canary':
        deploymentId = `dep-${Date.now()}`;
        addDeployment({
          id: deploymentId,
          service_id: params.service_id as string,
          cluster_id: params.cluster_id as string,
          image_tag: params.image_tag as string,
          strategy: (params.strategy as string) || 'canary',
          traffic_pct: 0,
          phase: 'Starting',
          metrics: { error_rate: 0, latency_p99: 0 },
          status: 'active',
          started_at: new Date().toISOString()
        });
        startCanary(deploymentId);
        break;
    }

    removePendingAction(input.action_id);

    const entry = writeAuditEntry({
      tool: tool_name,
      params,
      decision: 'approved',
      conflict: action.conflict,
      role: getIam().active_session.role,
      ts: new Date().toISOString()
    });

    ctx.logger.info('Action approved and executed', { action_id: input.action_id, tool: tool_name });

    return {
      status: 'executed',
      tool: tool_name,
      params,
      deployment_id: deploymentId,
      audit_hash: entry.hash,
      message: `${tool_name} executed successfully. State has been updated.`
    };
  }

  @Tool({
    name: 'deny_action',
    description: 'Deny and discard a queued high-risk action without executing it.',
    inputSchema: z.object({
      action_id: z.string().describe('The action_id to cancel'),
      reason:    z.string().optional().describe('Optional reason for denial')
    })
  })
  async denyAction(input: { action_id: string; reason?: string }, ctx: ExecutionContext) {
    const action = getPendingAction(input.action_id);
    if (!action) return { status: 'error', message: `No pending action found with id ${input.action_id}` };

    removePendingAction(input.action_id);

    const entry = writeAuditEntry({
      tool: action.tool_name,
      params: action.params,
      decision: 'denied',
      conflict: action.conflict,
      role: getIam().active_session.role,
      ts: new Date().toISOString()
    });

    ctx.logger.info('Action denied', { action_id: input.action_id, reason: input.reason });

    return {
      status: 'denied',
      tool: action.tool_name,
      reason: input.reason || 'No reason provided',
      audit_hash: entry.hash,
      message: `${action.tool_name} was denied and will not be executed.`
    };
  }

  // ── State inspection ─────────────────────────────────────────────────────────

  @Widget('governance-dashboard')
  @Tool({
    name: 'get_pending_actions',
    description: 'List all actions currently queued for human approval.',
    inputSchema: z.object({})
  })
  async getPendingActions(_input: Record<string, never>, ctx: ExecutionContext) {
    const state = getState();
    return {
      pending_count: state.pending_actions.length,
      actions: state.pending_actions.map(a => ({
        id: a.id,
        tool_name: a.tool_name,
        has_conflict: a.conflict?.has_conflict ?? false,
        timestamp: a.timestamp
      }))
    };
  }

  @Tool({
    name: 'get_state_summary',
    description: 'Returns a full cross-domain governance snapshot in one call: cluster health, active threats, isolated nodes, budget positions, contracts, deployments, pending actions count, and weather risk. Use this instead of calling all 5 resources individually when you need a complete situational overview.',
    inputSchema: z.object({})
  })
  async getStateSummary(_input: Record<string, never>, ctx: ExecutionContext) {
    const s = getState();
    return {
      clusters:          s.devops.clusters,
      deployments:       s.devops.deployments,
      prioritized_branches: s.devops.clusters.flatMap(c => c.prioritized_branches ?? []),
      threats:           s.secops.threats,
      isolated_nodes:    s.secops.isolated_nodes ?? [],
      budgets:           s.finops.ledgers,
      contracts:         s.finops.contracts,
      weather_risk:      s.weather?.risk_signal ?? 'unknown',
      weather_condition: s.weather?.condition ?? null,
      pending_approvals: s.pending_actions.length,
      active_role:       s.iam.active_session.role
    };
  }

  @Tool({
    name: 'get_deployment_status',
    description: 'Returns all active/recent canary deployments and their live traffic-split progress and metrics. Poll this after approving a deploy_canary action to watch the rollout advance.',
    inputSchema: z.object({})
  })
  async getDeploymentStatus(_input: Record<string, never>, ctx: ExecutionContext) {
    const s = getState();
    return { deployments: s.devops.deployments };
  }

  @Tool({
    name: 'get_root_cause_analysis',
    description: 'Generates an AIOps root-cause causality chain for an active threat, showing how the failure propagated through the system and a recommended remediation action.',
    inputSchema: z.object({
      threat_id: z.string().describe('The threat ID from get_state_summary or secops://network/threat-intel.json')
    })
  })
  async getRootCauseAnalysis(input: { threat_id: string }, ctx: ExecutionContext) {
    const state = getState();
    const threat = state.secops.threats.find(t => t.id === input.threat_id);
    if (!threat) return { status: 'error', message: `No threat found with id ${input.threat_id}` };

    const rca = await generateRCA(threat, state);
    return { status: 'ok', threat_id: input.threat_id, ...rca };
  }

  @Tool({
    name: 'get_rules',
    description: 'Lists the currently registered governance conflict-detection rules, in priority order.',
    inputSchema: z.object({})
  })
  async getRules(_input: Record<string, never>, ctx: ExecutionContext) {
    return { rules: listRules() };
  }

  @Tool({
    name: 'simulate_incident',
    description: 'Seeds a realistic incident scenario into state for demonstration purposes. Use this to quickly set up a compelling governance scenario from a clean state. incident_type: "ransomware" | "budget_crisis" | "deployment_conflict".',
    inputSchema: z.object({
      incident_type: z.enum(['ransomware', 'budget_crisis', 'deployment_conflict']).describe('The scenario to inject into state')
    })
  })
  async simulateIncident(input: { incident_type: string }, ctx: ExecutionContext) {
    const s = getState();
    if (input.incident_type === 'ransomware') {
      s.secops.threats.push({
        id: 'THR-CRIT-01',
        severity: 'critical',
        description: 'Ransomware beacon detected on SEC-NODE-03. Lateral movement in progress.',
        affected_node: 'SEC-NODE-03'
      });
      s.devops.clusters[0].queue_length += 5;
      ctx.logger.info('Ransomware scenario seeded');
      return { seeded: 'ransomware', message: 'Critical threat THR-CRIT-01 added to SecOps. SEC-NODE-03 at risk. PROD-01 queue pressure increased.' };
    }
    if (input.incident_type === 'budget_crisis') {
      const eng = s.finops.ledgers.find(l => l.department === 'Engineering');
      if (eng) { eng.budget = Math.max(eng.floor + 10000, eng.budget * 0.22); }
      ctx.logger.info('Budget crisis scenario seeded');
      return { seeded: 'budget_crisis', message: 'Engineering budget dropped to near-floor. Reallocations will now trigger conflicts.' };
    }
    if (input.incident_type === 'deployment_conflict') {
      s.devops.clusters[0].queue_length = 12;
      s.devops.clusters[0].active_deployments.push('billing-service-v2', 'auth-service-v3');
      ctx.logger.info('Deployment conflict scenario seeded');
      return { seeded: 'deployment_conflict', message: 'PROD-01 queue depth at 12, active deployments added. Halting now carries maximum disruption.' };
    }
    return { error: 'Unknown incident_type' };
  }

  @Tool({
    name: 'get_audit_log',
    description: 'Returns the last N entries from the tamper-evident hash-chained governance audit log — all approve/deny decisions made through the human-in-the-loop flow.',
    inputSchema: z.object({
      limit: z.number().min(1).max(100).default(20).optional().describe('Number of recent entries to return')
    })
  })
  async getAuditLog(input: { limit?: number }, ctx: ExecutionContext) {
    const limit = input.limit ?? 20;
    const entries = getAuditHistory(limit);
    return { entries, total: entries.length };
  }

  @Tool({
    name: 'verify_audit_chain',
    description: 'Recomputes the SHA-256 hash chain over the entire audit log and confirms no entry has been tampered with.',
    inputSchema: z.object({})
  })
  async verifyAuditChain(_input: Record<string, never>, ctx: ExecutionContext) {
    return verifyChain();
  }
}
