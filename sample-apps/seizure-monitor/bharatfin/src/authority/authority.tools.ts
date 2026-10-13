import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { mockApplications, mockConsents, mockUsers } from '../data/mock.js';
import { consentAuditLog } from '../consent/consent.gate.js';

export class AuthorityTools {
  /**
   * TOOL 1: authority_list_applications
   * List applications for a bank, optionally filtered by status.
   */
  @Tool({
    name: 'authority_list_applications',
    description:
      'List loan applications for a bank, optionally filtered by status (pending/approved/rejected/exception). Each application includes flaggedVariances describing exactly why it was flagged (a declared-vs-verified mismatch). When explaining an exception, quote flaggedVariances — do NOT infer a reason from the loan amounts.',
    inputSchema: z.object({
      bankId: z.string().describe('Bank identifier'),
      status: z
        .enum(['pending', 'approved', 'rejected', 'exception'])
        .optional()
        .describe('Filter by application status'),
    }),
  })
  @Widget('authority-dashboard')
  async authorityListApplications(
    input: {
      bankId: string;
      status?: 'pending' | 'approved' | 'rejected' | 'exception';
    },
    ctx: ExecutionContext
  ) {
    let applications = Array.from(mockApplications.values()).filter(
      (app) => app.bankId === input.bankId
    );

    if (input.status) {
      applications = applications.filter((app) => app.status === input.status);
    }

    ctx.logger.info(
      `Listed ${applications.length} applications for bank ${input.bankId}${input.status ? ` with status ${input.status}` : ''}`
    );

    return {
      applications: applications.map((app) => ({
        applicationId: app.applicationId,
        applicantName: app.applicantName,
        loanAmount: app.loanAmount,
        status: app.status,
        createdAt: app.createdAt,
        eligibleLoanAmount: app.serviceabilityResult?.eligibleLoanAmount || 0,
        qualifies: app.serviceabilityResult?.qualifies || false,
        varianceCount: (app.variances || []).filter((v) => v.flagged).length,
        // Ship the actual flagged variances, not just a count. With only a count the
        // model has to guess WHY an application was flagged and will invent a reason.
        flaggedVariances: (app.variances || [])
          .filter((v) => v.flagged)
          .map((v) => ({
            fieldName: v.fieldName,
            declaredValue: v.declaredValue,
            verifiedValue: v.verifiedValue,
            variancePercent: v.variancePercent,
            summary: `${v.fieldName}: declared ${v.declaredValue}, verified ${v.verifiedValue} (${v.variancePercent}% variance)`,
          })),
      })),
    };
  }

  /**
   * TOOL 2: authority_review_exception
   * Review an exception application and provide decision + note.
   */
  @Tool({
    name: 'authority_review_exception',
    description:
      'Review an exception application and provide approval/rejection decision with reviewer notes.',
    inputSchema: z.object({
      applicationId: z.string().describe('Application identifier'),
      decision: z
        .enum(['approved', 'rejected'])
        .describe('Review decision'),
      reviewerNote: z
        .string()
        .describe('Reviewer notes explaining the decision'),
    }),
  })
  async authorityReviewException(
    input: {
      applicationId: string;
      decision: 'approved' | 'rejected';
      reviewerNote: string;
    },
    ctx: ExecutionContext
  ) {
    const application = mockApplications.get(input.applicationId);
    if (!application) {
      throw new Error(`Application ${input.applicationId} not found`);
    }

    // Update application status
    application.status = input.decision;
    application.reviewerNote = input.reviewerNote;
    application.reviewedAt = new Date().toISOString();

    ctx.logger.info(
      `Reviewed exception application ${input.applicationId}: ${input.decision}`
    );

    return {
      applicationId: input.applicationId,
      status: application.status,
      decision: input.decision,
      reviewerNote: input.reviewerNote,
      reviewedAt: application.reviewedAt,
      confirmation: `Application ${input.applicationId} has been ${input.decision}.`,
    };
  }

  /**
   * TOOL 3: authority_get_application_detail
   * Get full application details including variance flags and serviceability result.
   */
  @Tool({
    name: 'authority_get_application_detail',
    description:
      'Get full application details including applicant info, variance flags, and serviceability result.',
    inputSchema: z.object({
      applicationId: z.string().describe('Application identifier'),
    }),
  })
  async authorityGetApplicationDetail(
    input: { applicationId: string },
    ctx: ExecutionContext
  ) {
    const application = mockApplications.get(input.applicationId);
    if (!application) {
      throw new Error(`Application ${input.applicationId} not found`);
    }

    ctx.logger.info(`Retrieved full details for application ${input.applicationId}`);

    return {
      applicationId: application.applicationId,
      userId: application.userId,
      bankId: application.bankId,
      applicantName: application.applicantName,
      applicantEmail: application.applicantEmail,
      loanAmount: application.loanAmount,
      status: application.status,
      createdAt: application.createdAt,
      serviceabilityResult: application.serviceabilityResult || null,
      variances: application.variances || [],
      reviewerNote: application.reviewerNote || null,
      reviewedAt: application.reviewedAt || null,
      flaggedVariances: (application.variances || []).filter((v) => v.flagged),
    };
  }

  /**
   * TOOL 4: get_consent_audit_log
   * Regulator-facing evidence trail: every consent request and every data-access
   * attempt, including the ones that were refused.
   */
  @Tool({
    name: 'get_consent_audit_log',
    description:
      'Retrieve the consent audit trail: who requested which data, when, under what scope, and whether it was allowed or blocked. This is the regulator-facing evidence that the consent gate was actually enforced — including refused attempts. Optionally filter by applicant or application.',
    inputSchema: z.object({
      userId: z.string().optional().describe('Filter to one applicant'),
      applicationId: z.string().optional().describe('Filter to one application'),
      blockedOnly: z
        .boolean()
        .optional()
        .describe('Show only refused access attempts'),
    }),
  })
  async getConsentAuditLog(
    input: { userId?: string; applicationId?: string; blockedOnly?: boolean },
    ctx: ExecutionContext
  ) {
    let entries = [...consentAuditLog];

    if (input.userId) entries = entries.filter((e) => e.userId === input.userId);
    if (input.applicationId)
      entries = entries.filter((e) => e.applicationId === input.applicationId);
    if (input.blockedOnly)
      entries = entries.filter((e) => e.outcome === 'BLOCKED');

    // Current standing consents, so the log can be read against live state.
    const standing = Array.from(mockConsents.values())
      .filter((c) => !input.userId || c.userId === input.userId)
      .map((c) => ({
        consentId: c.consentId,
        applicantName: mockUsers.get(c.userId)?.name ?? c.userId,
        bankId: c.bankId,
        status: c.status,
        fiTypes: c.fiTypes ?? ['DEPOSIT'],
        purpose: c.purpose ?? null,
        expiresAt: c.expiresAt,
      }));

    ctx.logger.info(`Consent audit log: ${entries.length} entries returned`);

    return {
      totalEntries: entries.length,
      blockedAttempts: entries.filter((e) => e.outcome === 'BLOCKED').length,
      grantedAccesses: entries.filter((e) => e.outcome === 'ALLOWED').length,
      entries: entries.map((e) => ({
        entryId: e.entryId,
        timestamp: e.timestamp,
        event: e.event,
        applicantName: mockUsers.get(e.userId)?.name ?? e.userId,
        actor: e.actor,
        fiTypes: e.fiTypes ?? [],
        outcome: e.outcome,
        reason: e.reason,
      })),
      standingConsents: standing,
    };
  }
}
