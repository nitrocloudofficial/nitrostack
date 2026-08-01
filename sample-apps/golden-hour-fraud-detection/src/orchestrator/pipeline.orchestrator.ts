import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { AssignmentTools } from '../agent-2-assignment/assignment.tools.js';
import { LegalTools } from '../agent-3-legal/legal.tools.js';
import {
  Agent1TriageOutputSchema,
  Agent2AssignmentOutputSchema,
  Agent3LegalOutputSchema,
  type Agent1TriageOutput,
  type Agent2AssignmentOutput,
  type Agent3LegalOutput,
  type FraudType,
} from '../schemas/agent-output.schema.js';
import { TicketSchema, type Ticket } from '../schemas/ticket.schema.js';
import { TicketTools } from '../modules/fraud-pipeline/ticket.tools.js';
import { MasterCasePacketSchema, type MasterCasePacket } from './case-packet.schema.js';

const RunFraudPipelineInputSchema = z.object({
  ticket: TicketSchema.describe('Raw incoming fraud ticket to process end to end'),
});

const EMPTY_LOGGER_CONTEXT = {
  logger: {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
  },
} as unknown as ExecutionContext;

type RelatedTicketCriteria = {
  upi_id?: string;
  bank_account?: string;
  phone?: string;
  ifsc?: string;
  exclude_ticket_id?: string;
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function classifyFraudType(ticket: Ticket): FraudType {
  const searchText = normalizeText(
    `${ticket.fraud.medium} ${ticket.fraud.subject} ${ticket.fraud.description}`,
  );

  if (searchText.includes('phishing') || searchText.includes('kyc')) {
    return 'phishing';
  }
  if (searchText.includes('investment') || searchText.includes('fixed-deposit')) {
    return 'investment_scam';
  }
  if (ticket.fraud.medium === 'upi' || searchText.includes('upi')) {
    return 'upi_fraud';
  }
  if (searchText.includes('card')) {
    return 'card_fraud';
  }
  if (ticket.fraud.medium === 'cheque') {
    return 'cheque_fraud';
  }
  if (ticket.fraud.medium === 'bank_transfer') {
    return 'bank_transfer';
  }

  return 'general_fraud';
}

function buildRelatedTicketCriteria(ticket: Ticket): RelatedTicketCriteria | null {
  const fraudster = ticket.fraudster;
  if (!fraudster) {
    return null;
  }

  const criteria: RelatedTicketCriteria = {
    exclude_ticket_id: ticket.ticket_id,
  };

  if (fraudster.upi_id) {
    criteria.upi_id = fraudster.upi_id;
  }
  if (fraudster.bank_account) {
    criteria.bank_account = fraudster.bank_account;
  }
  if (fraudster.phone) {
    criteria.phone = fraudster.phone;
  }
  if (fraudster.ifsc) {
    criteria.ifsc = fraudster.ifsc;
  }

  return criteria.upi_id || criteria.bank_account || criteria.phone || criteria.ifsc
    ? criteria
    : null;
}

function estimateUrgency(ticket: Ticket, patternSuspected: boolean): Agent1TriageOutput['urgency'] {
  const fraudTime = new Date(ticket.fraud.timestamp).getTime();
  const elapsedHours = Number.isFinite(fraudTime)
    ? Math.max(0, (Date.now() - fraudTime) / (1000 * 60 * 60))
    : Number.POSITIVE_INFINITY;
  const highAmount = ticket.fraud.amount >= 100000;
  const nearDigitalWindow = ['upi', 'bank_transfer'].includes(ticket.fraud.medium);

  if (nearDigitalWindow && elapsedHours <= 24) {
    return {
      level: highAmount || patternSuspected ? 'critical' : 'high',
      revocability_window_remaining:
        'Likely within early digital-payment reporting window; non-authoritative and must be verified against current RBI guidance.',
      reasoning:
        'Recent electronic payment fraud may still benefit from urgent bank and payment-rail reporting.',
    };
  }

  if (patternSuspected || highAmount) {
    return {
      level: 'high',
      revocability_window_remaining:
        'Likely reduced or uncertain; non-authoritative and must be verified against current corpus guidance.',
      reasoning:
        'Pattern, related-ticket, or high-value indicators raise investigation priority.',
    };
  }

  return {
    level: 'medium',
    revocability_window_remaining:
      'Unknown or likely time-sensitive; non-authoritative and must be verified against current corpus guidance.',
    reasoning:
      'Single-ticket report without high-value or pattern indicators, but fraud response remains time-sensitive.',
  };
}

function calculateRiskScore(ticket: Ticket, patternSuspected: boolean, victimCount: number): number {
  let score = 30;

  if (ticket.fraud.amount >= 100000) {
    score += 25;
  } else if (ticket.fraud.amount >= 25000) {
    score += 15;
  }
  if (patternSuspected) {
    score += 25;
  }
  if (victimCount > 2) {
    score += 10;
  }
  if (ticket.attachments.length === 0) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getEvidenceGaps(ticket: Ticket): string[] {
  const gaps: string[] = [];

  if (!ticket.fraudster) {
    gaps.push('No fraudster identifiers were provided.');
    return gaps;
  }
  if (!ticket.fraudster.upi_id && ticket.fraud.medium === 'upi') {
    gaps.push('Fraudster UPI ID is missing.');
  }
  if (!ticket.fraudster.phone) {
    gaps.push('Fraudster phone number is missing.');
  }
  if (!ticket.fraudster.bank_account && ticket.fraud.medium === 'bank_transfer') {
    gaps.push('Fraudster bank account is missing.');
  }
  if (ticket.attachments.length === 0) {
    gaps.push('No supporting screenshots or documents were attached.');
  }

  return gaps;
}

function getCapacityRatio(department: { current_caseload: number; capacity: number }): number {
  return department.current_caseload / department.capacity;
}

function decideTeamSize(
  triage: Agent1TriageOutput,
): Agent2AssignmentOutput['team_size_recommendation'] {
  if (
    triage.urgency.level === 'critical' ||
    triage.scale.victim_count_estimate >= 5 ||
    triage.risk_score >= 85
  ) {
    return 'full_team';
  }
  if (
    triage.scale.pattern_suspected ||
    triage.scale.victim_count_estimate > 1 ||
    triage.urgency.level === 'high' ||
    triage.risk_score >= 60
  ) {
    return 'small_team';
  }

  return 'individual';
}

function choosePersonnelCount(teamSize: Agent2AssignmentOutput['team_size_recommendation']): number {
  if (teamSize === 'full_team') {
    return 3;
  }
  if (teamSize === 'small_team') {
    return 2;
  }

  return 1;
}

function isAvailable(status: string): boolean {
  const normalized = normalizeText(status);
  return normalized === 'available' || normalized === 'limited';
}

function buildLegalSuggestedActions(
  legalEntries: Array<{
    name: string;
    section: string;
    source_url: string;
    mandatory_timeline?: string;
  }>,
  triage: Agent1TriageOutput,
): Agent3LegalOutput['suggested_actions'] {
  return legalEntries.slice(0, 4).map((entry) => ({
    action: entry.mandatory_timeline
      ? `Review transaction reporting and reversal steps under ${entry.name} ${entry.section}.`
      : `Review whether ${entry.name} ${entry.section} applies to the reported fraud pattern.`,
    legal_basis: `${entry.name} ${entry.section}`,
    urgency: entry.mandatory_timeline
      ? `${triage.urgency.level}: ${entry.mandatory_timeline}`
      : triage.urgency.level,
    citation: entry.source_url,
  }));
}

export class FraudPipelineOrchestrator {
  private readonly ticketTools = new TicketTools();
  private readonly assignmentTools = new AssignmentTools();
  private readonly legalTools = new LegalTools();

  @Tool({
    name: 'run_fraud_pipeline',
    description:
      'Run the deterministic multi-agent fraud pipeline: ingest a ticket, generate Agent 1 triage, fan out to Agent 2 assignment and Agent 3 legal guidance, then return a dashboard-ready master case packet. The final output MUST include a LEGAL & COMPLIANCE STATUTES section at the bottom listing every applicable law (name, section, summary, source URL) and every suggested action with legal basis, urgency, and citation.',
    inputSchema: RunFraudPipelineInputSchema,
    outputSchema: MasterCasePacketSchema,
  })
  async runFraudPipeline(
    input: z.infer<typeof RunFraudPipelineInputSchema>,
    ctx: ExecutionContext,
  ): Promise<MasterCasePacket> {
    ctx.logger.info('Starting fraud pipeline', { ticket_id: input.ticket.ticket_id });

    const ticket = TicketSchema.parse(input.ticket);
    const triage = await this.runAgent1Triage(ticket, ctx);
    const [assignment, legal] = await Promise.all([
      this.runAgent2Assignment(triage, ticket, ctx),
      this.runAgent3Legal(triage, ticket, ctx),
    ]);

    // Build the LEGAL & COMPLIANCE STATUTES summary
    const statuteLines = legal.applicable_laws.map(
      (law, i) =>
        `${i + 1}. ${law.name} — ${law.section}\n   Summary: ${law.summary}\n   Source: ${law.source_url}`,
    );
    const actionLines = legal.suggested_actions.map(
      (action, i) =>
        `${i + 1}. ${action.action}\n   Legal Basis: ${action.legal_basis}\n   Urgency: ${action.urgency}\n   Citation: ${action.citation}`,
    );
    const legalStatutesSummary =
      '=== LEGAL & COMPLIANCE STATUTES ===\n\n' +
      `Jurisdiction: ${legal.jurisdiction}\n` +
      `Confidence: ${legal.confidence_notes}\n\n` +
      '--- Applicable Laws ---\n' +
      (statuteLines.length > 0 ? statuteLines.join('\n\n') : 'No statutes found — route to manual legal review.') +
      '\n\n--- Suggested Actions (Advisory) ---\n' +
      (actionLines.length > 0 ? actionLines.join('\n\n') : 'No suggested actions available.');

    const packet = {
      ticket_id: ticket.ticket_id,
      generated_at: new Date().toISOString(),
      status: 'assigned' as const,
      ticket: {
        ...ticket,
        status: 'assigned' as const,
      },
      agent_outputs: {
        triage,
        assignment,
        legal,
      },
      dashboard: {
        title: ticket.fraud.subject,
        priority: triage.urgency.level,
        assigned_department_id: assignment.assigned_department_id,
        assigned_personnel_count: assignment.assigned_personnel.length,
        legal_citation_count: legal.applicable_laws.length,
        escalation_flag: assignment.escalation_flag,
        legal_statutes_summary: legalStatutesSummary,
      },
    };

    return MasterCasePacketSchema.parse(packet);
  }

  private async runAgent1Triage(
    ticket: Ticket,
    ctx: ExecutionContext,
  ): Promise<Agent1TriageOutput> {
    ctx.logger.info('Running Agent 1 triage', { ticket_id: ticket.ticket_id });

    const criteria = buildRelatedTicketCriteria(ticket);
    const relatedTickets = criteria
      ? await this.ticketTools.getRelatedTickets({ criteria }, ctx)
      : { match_count: 0, related_tickets: [] };
    const relatedTicketIds = relatedTickets.related_tickets.map(
      (relatedTicket) => relatedTicket.ticket_id,
    );
    const patternSuspected = relatedTicketIds.length > 0;
    const victimCount = 1 + relatedTicketIds.length;
    const urgency = estimateUrgency(ticket, patternSuspected);

    return Agent1TriageOutputSchema.parse({
      ticket_id: ticket.ticket_id,
      fraud_type: classifyFraudType(ticket),
      scale: {
        victim_count_estimate: victimCount,
        pattern_suspected: patternSuspected,
        related_ticket_ids: relatedTicketIds,
      },
      urgency,
      risk_score: calculateRiskScore(ticket, patternSuspected, victimCount),
      evidence_gaps: getEvidenceGaps(ticket),
    });
  }

  private async runAgent2Assignment(
    triage: Agent1TriageOutput,
    ticket: Ticket,
    ctx: ExecutionContext,
  ): Promise<Agent2AssignmentOutput> {
    ctx.logger.info('Running Agent 2 assignment', { ticket_id: ticket.ticket_id });

    const departmentDirectory = await this.assignmentTools.getDepartmentDirectory(
      {
        jurisdiction: ticket.region.jurisdiction_code,
        specialization: triage.fraud_type,
      },
      ctx,
    );
    const candidateDepartment = [...departmentDirectory.departments].sort(
      (left, right) => getCapacityRatio(left) - getCapacityRatio(right),
    )[0];

    if (!candidateDepartment) {
      throw new Error('No candidate department returned by get_department_directory.');
    }

    const teamSize = decideTeamSize(triage);
    const personnelAvailability = await this.assignmentTools.getPersonnelAvailability(
      { department_id: candidateDepartment.department_id },
      ctx,
    );
    const selectedPersonnel = personnelAvailability.personnel
      .filter((person) => isAvailable(person.availability_status))
      .slice(0, choosePersonnelCount(teamSize));

    if (selectedPersonnel.length === 0) {
      throw new Error('No available personnel returned by get_personnel_availability.');
    }

    return Agent2AssignmentOutputSchema.parse({
      ticket_id: triage.ticket_id,
      assigned_department_id: candidateDepartment.department_id,
      assigned_personnel: selectedPersonnel.map((person) => ({
        id: person.personnel_id,
        role: person.role,
      })),
      team_size_recommendation: teamSize,
      reasoning:
        `${candidateDepartment.name} matches ${triage.fraud_type} for ${ticket.region.jurisdiction_code}. ` +
        `Department load is ${candidateDepartment.current_caseload}/${candidateDepartment.capacity}; ` +
        `${selectedPersonnel.length} personnel selected based on availability and current case count.`,
      escalation_flag:
        triage.urgency.level === 'critical' ||
        triage.scale.pattern_suspected ||
        triage.risk_score >= 80,
    });
  }

  private async runAgent3Legal(
    triage: Agent1TriageOutput,
    ticket: Ticket,
    ctx: ExecutionContext,
  ): Promise<Agent3LegalOutput> {
    ctx.logger.info('Running Agent 3 legal compliance', { ticket_id: ticket.ticket_id });

    // Build a contextual query from the fraud type and ticket details
    // rather than always hardcoding 'transaction reversal'
    const queryParts: string[] = [];
    if (ticket.fraud.medium === 'upi' || triage.fraud_type.includes('upi')) {
      queryParts.push('transaction reversal');
    }
    if (triage.fraud_type.includes('phishing') || triage.fraud_type.includes('identity')) {
      queryParts.push('identity theft');
    }
    if (triage.fraud_type.includes('investment') || triage.fraud_type.includes('scam')) {
      queryParts.push('cheating');
    }
    // Default fallback query
    if (queryParts.length === 0) {
      queryParts.push('transaction reversal');
    }

    const legalCorpus = await this.legalTools.searchLegalCorpus(
      {
        fraud_type: triage.fraud_type,
        jurisdiction: ticket.region.jurisdiction_code,
        query: queryParts[0],
      },
      ctx ?? EMPTY_LOGGER_CONTEXT,
    );
    const applicableLaws = legalCorpus.results.map((entry) => ({
      name: entry.name,
      section: entry.section,
      summary: entry.summary,
      source_url: entry.source_url,
      relevance: entry.relevance,
    }));

    return Agent3LegalOutputSchema.parse({
      ticket_id: triage.ticket_id,
      jurisdiction: ticket.region.jurisdiction_code,
      applicable_laws: applicableLaws,
      suggested_actions: buildLegalSuggestedActions(legalCorpus.results, triage),
      confidence_notes:
        legalCorpus.match_count > 0
          ? `Guidance is grounded in ${legalCorpus.match_count} mock corpus entries for ${ticket.region.jurisdiction_code}. Verify current corpus freshness before enforcement.`
          : 'No legal corpus results were returned; route to manual legal review.',
    });
  }
}

