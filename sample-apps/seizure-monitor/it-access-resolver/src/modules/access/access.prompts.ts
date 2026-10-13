import { PromptDecorator as Prompt, ControllerDecorator as Controller, ExecutionContext } from '@nitrostack/core';

/**
 * AccessPrompts — Standard Operating Procedure (SOP) prompts for the IT Access Resolver.
 *
 * These reusable prompt templates guide AI clients and helpdesk operators through
 * complex, multi-step access resolution workflows without requiring manual instruction
 * composition each time.
 */
@Controller('access')
export class AccessPrompts {

  // ---------------------------------------------------------------------------
  // triage_open_tickets
  // ---------------------------------------------------------------------------
  @Prompt({
    name: 'triage_open_tickets',
    description:
      'Standard Operating Procedure: Automatically triage all open IT access tickets. ' +
      'Reads the full ticket list, diagnoses each unresolved ticket sequentially, and ' +
      'generates an executive action plan before applying automated fixes where possible.',
    arguments: [],
  })
  async triageOpenTickets(_args: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Loading SOP: triage_open_tickets');
    return [
      {
        role: 'user' as const,
        content: [
          'You are an expert IT access resolver. Follow this Standard Operating Procedure:',
          '',
          '## STEP 1 — Ingest Ticket Backlog',
          'Call `ticket_get_all_tickets` to retrieve every ticket in the system.',
          '',
          '## STEP 2 — Filter Open Tickets',
          'From the results, isolate every ticket with status "open".',
          '',
          '## STEP 3 — Sequential Diagnosis',
          'For each open ticket:',
          '  a. Identify the tool/app mentioned in the issue text.',
          '  b. Call `ticket_run_full_diagnosis` with the ticketId and extracted toolName.',
          '  c. Record the rootCause and fixable flag from the diagnosis.',
          '',
          '## STEP 4 — Executive Summary',
          'After diagnosing all open tickets, output a brief executive summary table:',
          '  | Ticket ID | Employee | Root Cause | Fixable? |',
          '',
          '## STEP 5 — Automated Remediation',
          'For every fixable ticket, call `ticket_apply_fix`. For non-fixable tickets, report they are escalated.',
          '',
          '## STEP 6 — Final Report',
          'List all actions taken, tickets resolved, and tickets escalated.',
          '',
          'Begin by calling `ticket_get_all_tickets` now.',
        ].join('\n'),
      },
    ];
  }

  // ---------------------------------------------------------------------------
  // onboard_employee_access
  // ---------------------------------------------------------------------------
  @Prompt({
    name: 'onboard_employee_access',
    description:
      'Standard Operating Procedure: Guide a new or pending employee through full access onboarding. ' +
      'Validates identity status, checks device trust, diagnoses VPN, and provisions initial group memberships.',
    arguments: [
      {
        name: 'employeeId',
        description: 'The employee ID to onboard, e.g. E104',
        required: true,
      },
      {
        name: 'toolsNeeded',
        description: 'Comma-separated list of tools the employee needs access to, e.g. "Slack,Figma"',
        required: false,
      },
    ],
  })
  async onboardEmployeeAccess(
    args: { employeeId: string; toolsNeeded?: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info(`Loading SOP: onboard_employee_access for ${args.employeeId}`);
    const tools = args.toolsNeeded
      ? args.toolsNeeded.split(',').map(t => t.trim())
      : ['Slack'];

    return [
      {
        role: 'user' as const,
        content: [
          `You are an IT onboarding specialist. Onboard employee **${args.employeeId}** using this SOP:`,
          '',
          '## STEP 1 — Identity Verification',
          `Call \`check_identity_status\` with employeeId="${args.employeeId}".`,
          'If status is "suspended", stop and report manual HR intervention required.',
          'If status is "pending", note this is a new hire and proceed.',
          '',
          '## STEP 2 — Network & Device Check',
          `Call \`check_network_status\` with employeeId="${args.employeeId}".`,
          'If VPN is not connected or device is not trusted, call `reset_network_access`.',
          '',
          '## STEP 3 — Tool Access Provisioning',
          `The employee requires access to: **${tools.join(', ')}**`,
          'For each tool:',
          '  a. Call `check_group_membership` to see if a required group exists.',
          '  b. If not in the required group, call `add_to_group`.',
          '  c. Call `check_license_availability` to confirm seats are available.',
          '  d. If no seats, call `request_license`.',
          '',
          '## STEP 4 — Onboarding Report',
          'Output a checklist of every step completed and its outcome.',
          'If any step failed, include the recommended escalation path.',
          '',
          `Begin by calling \`check_identity_status\` for employee ${args.employeeId}.`,
        ].join('\n'),
      },
    ];
  }

  // ---------------------------------------------------------------------------
  // audit_license_usage
  // ---------------------------------------------------------------------------
  @Prompt({
    name: 'audit_license_usage',
    description:
      'Standard Operating Procedure: Audit all software license pools against active identity records. ' +
      'Identifies wasted seats held by suspended or pending employees and recommends reclamation actions.',
    arguments: [],
  })
  async auditLicenseUsage(_args: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Loading SOP: audit_license_usage');
    return [
      {
        role: 'user' as const,
        content: [
          'You are an IT license compliance auditor. Follow this Standard Operating Procedure:',
          '',
          '## STEP 1 — Read All Data Sources',
          'Read resource `identities://all` to get all employee records.',
          'Read resource `licenses://all` to get all software license pools.',
          '',
          '## STEP 2 — Identify Inactive Seat Holders',
          'Cross-reference the data:',
          '  - For each license pool, note requiredGroup (if any).',
          '  - Check which employees have status "suspended" or "pending".',
          '  - Flag any suspended/pending employee consuming a seat in a licensed tool.',
          '',
          '## STEP 3 — Calculate Waste & Savings',
          'For each flagged employee:',
          '  - Estimate the annual cost of wasted seat (note: exact pricing not available, mark as "TBD").',
          '  - Recommend calling `remove_from_group` to reclaim the seat.',
          '',
          '## STEP 4 — License Health Report',
          'Output a structured report:',
          '  | Tool | Total Seats | Used | Free | Wasted (Inactive Users) | Action Needed |',
          '',
          '## STEP 5 — Recommendations',
          'List the top 3 highest-impact reclamation actions.',
          '',
          'Begin by reading `identities://all` and `licenses://all` now.',
        ].join('\n'),
      },
    ];
  }
}
