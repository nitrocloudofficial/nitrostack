import { ToolDecorator as Tool, ControllerDecorator as Controller, Widget, ExecutionContext, z, emitEvent, Cache, RateLimit } from '@nitrostack/core';
import { createRequire } from 'module';
import { DiagnosisResult } from './access.types.js';
import { Ticket } from './ticket.types.js';
import { AccessTools } from './access.tools.js';

// ---------------------------------------------------------------------------
// Fixture bootstrap — same createRequire pattern as access.tools.ts
// ---------------------------------------------------------------------------
const require = createRequire(import.meta.url);
const ticketsData: Ticket[] = require('../../../fixtures/tickets.json');

// In-memory mutable store (deep copy so fixture file stays clean across restarts)
let ticketStore: Ticket[] = JSON.parse(JSON.stringify(ticketsData));

// Internal instance of AccessTools used to call diagnostic/fix methods directly.
// TicketTools acts as the orchestration layer on top of the low-level AccessTools.
const access = new AccessTools();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a monotonically increasing ticket ID. */
function nextId(): string {
  const max = ticketStore.reduce((n, t) => {
    const num = parseInt(t.id.replace('TKT-', ''), 10);
    return isNaN(num) ? n : Math.max(n, num);
  }, 0);
  return `TKT-${String(max + 1).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@Controller('ticket')
export class TicketTools {

  // -------------------------------------------------------------------------
  // createTicket
  // -------------------------------------------------------------------------
  @Tool({
    name: 'create_ticket',
    description: 'Create a new IT access support ticket for an employee.',
    inputSchema: z.object({
      employeeId: z.string().describe('The employee ID raising the ticket, e.g. E102'),
      issueText: z.string().describe('Free-text description of the access problem'),
    }),
  })
  @RateLimit({ requests: 10, window: '1m' })
  @Widget('ticket-dashboard')
  createTicket(
    input: { employeeId: string; issueText: string },
    ctx: ExecutionContext,
  ): any {
    ctx?.logger?.info(`Creating ticket for ${input.employeeId}`);

    const ticket: Ticket = {
      id: nextId(),
      employeeId: input.employeeId,
      issueText: input.issueText,
      status: 'open',
      resolutionSteps: [],
      createdAt: new Date().toISOString(),
    };

    ticketStore.push(ticket);

    // Emit lifecycle event → AuditService records this
    emitEvent('ticket.created', {
      ticketId: ticket.id,
      employeeId: ticket.employeeId,
      issueText: ticket.issueText,
    });

    return { ...ticket, allTickets: [...ticketStore] };
  }

  // -------------------------------------------------------------------------
  // runFullDiagnosis
  // -------------------------------------------------------------------------
  @Tool({
    name: 'run_full_diagnosis',
    description:
      'Run a full end-to-end diagnosis on a ticket: checks identity, group membership, ' +
      'license availability, network status, and derives the root cause. ' +
      'All intermediate check results are returned so a widget can show each step.',
    inputSchema: z.object({
      ticketId: z.string().describe('The ticket ID to diagnose, e.g. TKT-002'),
      toolName: z.string().describe('The tool/app the employee cannot access, e.g. Figma'),
    }),
  })
  @Widget('ticket-diagnosis')
  runFullDiagnosis(
    input: { ticketId: string; toolName: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info(`Running full diagnosis on ${input.ticketId} for tool ${input.toolName}`);

    const ticket = ticketStore.find(t => t.id === input.ticketId);
    if (!ticket) return { success: false, error: `Ticket ${input.ticketId} not found` };

    const initialStatus = ticket.status;
    ticket.status = 'diagnosing';

    // --- Step 1: Identity check ---
    const identityCheck = access.checkIdentityStatus(
      { employeeId: ticket.employeeId },
      ctx,
    );

    // --- Step 2: Group membership check ---
    const groupCheck = access.checkGroupMembership(
      { employeeId: ticket.employeeId, toolName: input.toolName },
      ctx,
    );

    // --- Step 3: License availability check ---
    const licenseCheck = access.checkLicenseAvailability(
      { toolName: input.toolName },
      ctx,
    );

    // --- Step 4: Network status check ---
    const networkCheck = access.checkNetworkStatus(
      { employeeId: ticket.employeeId },
      ctx,
    );

    // --- Step 5: Root-cause diagnosis ---
    const diagnosis: DiagnosisResult = access.diagnoseRootCause(
      { employeeId: ticket.employeeId, toolName: input.toolName },
      ctx,
    );

    // Persist diagnosis onto the ticket and transition status intelligently
    ticket.diagnosis = diagnosis;
    if (initialStatus === 'resolved') {
      ticket.status = 'resolved';
      if (!ticket.resolutionSteps.includes('Verified all access controls healthy during diagnostic rescan.')) {
        ticket.resolutionSteps.push('Verified all access controls healthy during diagnostic rescan.');
      }
    } else if (initialStatus === 'escalated') {
      ticket.status = 'escalated';
    }

    ctx.logger.info(`Diagnosis complete for ${input.ticketId}: ${diagnosis.rootCause}`);

    // Emit lifecycle event → AuditService records this
    emitEvent('ticket.diagnosed', {
      ticketId: input.ticketId,
      employeeId: ticket.employeeId,
      rootCause: diagnosis.rootCause,
      fixable: diagnosis.fixable,
    });

    return {
      ticketId: input.ticketId,
      status: ticket.status,
      checks: {
        identity: identityCheck,
        groupMembership: groupCheck,
        licenseAvailability: licenseCheck,
        networkStatus: networkCheck,
      },
      diagnosis,
    };
  }

  // -------------------------------------------------------------------------
  // applyFix
  // -------------------------------------------------------------------------
  @Tool({
    name: 'apply_fix',
    description:
      'Apply the automated fix for a diagnosed ticket. ' +
      'Calls the appropriate remediation tool based on the stored root cause, ' +
      'appends a human-readable resolution step, and sets the ticket status to ' +
      '"resolved" (if fixable) or "escalated" (if not).',
    inputSchema: z.object({
      ticketId: z.string().describe('The ticket ID to fix, e.g. TKT-002'),
    }),
  })
  @RateLimit({ requests: 5, window: '1m' })
  @Widget('ticket-dashboard')
  applyFix(
    input: { ticketId: string },
    ctx: ExecutionContext,
  ) {
    ctx?.logger?.info(`Applying fix for ${input.ticketId}`);

    const ticket = ticketStore.find(t => t.id === input.ticketId);
    if (!ticket) return { success: false, error: `Ticket ${input.ticketId} not found`, allTickets: [...ticketStore] };
    if (!ticket.diagnosis) {
      return { success: false, error: 'Ticket has not been diagnosed yet. Run runFullDiagnosis first.', allTickets: [...ticketStore] };
    }

    const { rootCause, fixable } = ticket.diagnosis;
    const now = new Date().toISOString();
    let fixResult: Record<string, unknown>;
    let stepDescription: string;

    if (!fixable) {
      ticket.status = 'escalated';
      ticket.resolvedAt = now;
      stepDescription = `Issue (${rootCause}) cannot be auto-resolved — ticket escalated to IT admin.`;
      ticket.resolutionSteps.push(stepDescription);
      emitEvent('ticket.escalated', {
        ticketId: input.ticketId,
        employeeId: ticket.employeeId,
        rootCause,
        reason: stepDescription,
      });
      return {
        ticketId: input.ticketId,
        success: false,
        escalated: true,
        rootCause,
        step: stepDescription,
        ticket,
        allTickets: [...ticketStore],
      };
    }

    switch (rootCause) {
      case 'not_in_group': {
        // Extract the required group from the diagnosis detail
        // Detail format: "Missing group 'design-all' required for Figma"
        const match = ticket.diagnosis.detail.match(/Missing group '([^']+)'/);
        const groupName = match ? match[1] : 'unknown-group';
        fixResult = access.addToGroup({ employeeId: ticket.employeeId, groupName }, ctx) as Record<string, unknown>;
        stepDescription = `Added employee ${ticket.employeeId} to group '${groupName}'.`;
        break;
      }
      case 'no_license': {
        // Extract the tool name from the diagnosis detail
        // Detail format: "No seats available for Figma (18/20)"
        const match = ticket.diagnosis.detail.match(/No seats available for (\S+)/);
        const toolName = match ? match[1] : 'unknown-tool';
        fixResult = access.requestLicense({ toolName }, ctx) as Record<string, unknown>;
        stepDescription = `Requested additional license seat for '${toolName}'.`;
        break;
      }
      case 'network_issue': {
        fixResult = access.resetNetworkAccess({ employeeId: ticket.employeeId }, ctx) as Record<string, unknown>;
        stepDescription = `Reset VPN/network access for employee ${ticket.employeeId}.`;
        break;
      }
      case 'account_suspended': {
        // account_suspended with fixable=true means status is "pending" — manual onboarding step needed
        ticket.status = 'escalated';
        ticket.resolvedAt = now;
        stepDescription = `Account is pending activation — escalated to HR/IT onboarding team.`;
        ticket.resolutionSteps.push(stepDescription);
        emitEvent('ticket.escalated', {
          ticketId: input.ticketId,
          employeeId: ticket.employeeId,
          rootCause,
          reason: stepDescription,
        });
        return {
          ticketId: input.ticketId,
          success: false,
          escalated: true,
          rootCause,
          step: stepDescription,
          ticket,
          allTickets: [...ticketStore],
        };
      }
      default: {
        ticket.status = 'escalated';
        ticket.resolvedAt = now;
        stepDescription = `Unknown root cause — ticket escalated for manual investigation.`;
        ticket.resolutionSteps.push(stepDescription);
        return {
          ticketId: input.ticketId,
          success: false,
          escalated: true,
          rootCause,
          step: stepDescription,
          ticket,
          allTickets: [...ticketStore],
        };
      }
    }

    ticket.resolutionSteps.push(stepDescription);
    ticket.status = 'resolved';
    ticket.resolvedAt = now;

    // Emit lifecycle event → AuditService records this
    emitEvent('ticket.resolved', {
      ticketId: input.ticketId,
      employeeId: ticket.employeeId,
      rootCause,
      step: stepDescription,
    });

    return {
      ticketId: input.ticketId,
      success: true,
      rootCause,
      step: stepDescription,
      fixResult,
      ticket,
      allTickets: [...ticketStore],
    };
  }

  // -------------------------------------------------------------------------
  // getTicket
  // -------------------------------------------------------------------------
  @Tool({
    name: 'get_ticket',
    description: 'Retrieve the full current state of a single ticket by ID.',
    inputSchema: z.object({
      ticketId: z.string().describe('The ticket ID, e.g. TKT-001'),
    }),
  })
  @Widget('ticket-dashboard')
  getTicket(
    input: { ticketId: string },
    ctx: ExecutionContext,
  ): any {
    ctx?.logger?.info(`Fetching ticket ${input.ticketId}`);
    const ticket = ticketStore.find(t => t.id === input.ticketId);
    if (!ticket) return { found: false, error: `Ticket ${input.ticketId} not found` };
    return { ticket, found: true, id: ticket.id, status: ticket.status, employeeId: ticket.employeeId, issueText: ticket.issueText, resolutionSteps: ticket.resolutionSteps, createdAt: ticket.createdAt, resolvedAt: ticket.resolvedAt };
  }

  // -------------------------------------------------------------------------
  // getAllTickets
  // -------------------------------------------------------------------------
  @Tool({
    name: 'get_all_tickets',
    description: 'Return all tickets — used to populate the IT dashboard widget.',
    inputSchema: z.object({}),
  })
  @Widget('ticket-dashboard')
  getAllTickets(
    _input: Record<string, never>,
    ctx: ExecutionContext,
  ): { allTickets: Ticket[]; count: number } {
    ctx.logger.info('Fetching all tickets');
    return { allTickets: [...ticketStore], count: ticketStore.length };
  }

  // -------------------------------------------------------------------------
  // getHelpdeskAnalytics
  // -------------------------------------------------------------------------
  @Tool({
    name: 'get_helpdesk_analytics',
    description:
      'Returns real-time IT helpdesk KPIs: ticket volume by status, root-cause breakdown, ' +
      'mean time to resolve (MTTR), auto-fix success rate, license utilization, and per-employee incident counts. ' +
      'Use this to render the executive analytics dashboard.',
    inputSchema: z.object({}),
  })
  @Widget('helpdesk-analytics')
  getHelpdeskAnalytics(
    _input: Record<string, never>,
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Computing helpdesk analytics');

    const now = Date.now();
    const total = ticketStore.length;

    // Status counts
    const statusCounts: Record<string, number> = { open: 0, diagnosing: 0, resolved: 0, escalated: 0 };
    ticketStore.forEach(t => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });

    // Root cause breakdown
    const rootCauseCounts: Record<string, number> = {};
    ticketStore.forEach(t => {
      const rc = t.diagnosis?.rootCause ?? 'pending';
      rootCauseCounts[rc] = (rootCauseCounts[rc] || 0) + 1;
    });

    // MTTR (Mean Time To Resolve) — only for resolved tickets
    const resolvedTickets = ticketStore.filter(t => t.status === 'resolved' && t.resolvedAt && t.createdAt);
    let mttrMinutes = 0;
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce((sum, t) => {
        return sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime());
      }, 0);
      mttrMinutes = Math.round(totalMs / resolvedTickets.length / 60000);
    }

    // Auto-fix success rate
    const diagnosed = ticketStore.filter(t => t.diagnosis);
    const autoFixed = ticketStore.filter(t => t.status === 'resolved' && t.resolutionSteps.length > 0);
    const fixRate = diagnosed.length > 0 ? Math.round((autoFixed.length / diagnosed.length) * 100) : 0;

    // Per-employee incident heatmap
    const employeeIncidents: Record<string, number> = {};
    ticketStore.forEach(t => {
      employeeIncidents[t.employeeId] = (employeeIncidents[t.employeeId] || 0) + 1;
    });

    // SLA tracking: tickets open > 60 min
    const slaBreaches = ticketStore.filter(t => {
      if (t.status === 'resolved' || t.status === 'escalated') return false;
      const age = now - new Date(t.createdAt).getTime();
      return age > 60 * 60 * 1000; // > 1 hour
    }).length;

    // Recent activity feed (last 5 actions)
    const recentActivity = ticketStore
      .filter(t => t.resolutionSteps.length > 0)
      .flatMap(t => t.resolutionSteps.map(step => ({ ticketId: t.id, employeeId: t.employeeId, action: step })))
      .slice(-5);

    return {
      summary: {
        totalTickets: total,
        statusCounts,
        rootCauseCounts,
        mttrMinutes,
        autoFixRate: fixRate,
        slaBreaches,
      },
      employeeIncidents,
      recentActivity,
      generatedAt: new Date().toISOString(),
    };
  }
}

// Export store accessor for use by the resource layer (avoids duplicating the store)
export function getTicketStore(): Ticket[] {
  return ticketStore;
}
