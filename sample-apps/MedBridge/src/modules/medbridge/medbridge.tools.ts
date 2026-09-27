import { Injectable, ToolDecorator as Tool, Widget, emitEvent, z, ExecutionContext } from '@nitrostack/core';
import {
  MedBridgeService,
  ConsentRequiredError,
  DrugCheckResult,
  ReconciliationResult,
  ConsentLogEntry,
  ReconciliationReport,
} from './medbridge.service.js';

function actorOf(ctx: ExecutionContext): string {
  return ctx.auth?.subject ?? 'attending-physician';
}

/** Wraps a consent-gated read so every tool reports the same actionable error shape. */
async function withConsent<T>(
  medbridge: MedBridgeService,
  patientId: string,
  toolName: string,
  actor: string,
  fn: () => T
): Promise<T> {
  try {
    medbridge.requireConsent(patientId, toolName, actor);
  } catch (err) {
    if (err instanceof ConsentRequiredError) {
      throw new Error(err.message);
    }
    throw err;
  }
  return fn();
}

@Injectable({ deps: [MedBridgeService] })
export class MedBridgeTools {
  constructor(private medbridge: MedBridgeService) {}

  // ---------------------------------------------------------------------
  // Discovery
  // ---------------------------------------------------------------------

  @Widget('medbridge-patient-list')
  @Tool({
    name: 'medbridge_list_patients',
    title: 'List Patients',
    description:
      'List patients known to MedBridge, with their ABHA ID and current consent status. ' +
      'Use this first to find a valid patientId before calling any other MedBridge tool.',
    inputSchema: z.object({}).strict(),
    outputSchema: z.object({
      patients: z.array(
        z.object({
          patientId: z.string(),
          name: z.string(),
          abhaId: z.string(),
          consentActive: z.boolean(),
        })
      ),
      summaryText: z.string().optional(),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  })
  async listPatients(_input: {}, ctx: ExecutionContext) {
    ctx.logger.info('Listing patients');
    const patients = this.medbridge.listPatients().map((p) => ({
      ...p,
      consentActive: this.medbridge.getConsentStatus(p.patientId).active,
    }));
    return {
      patients,
      summaryText: patients
        .map((p) => `${p.patientId} — ${p.name} (ABHA ${p.abhaId}) — consent: ${p.consentActive ? 'active' : 'not granted'}`)
        .join('\n'),
    };
  }

  // ---------------------------------------------------------------------
  // Consent lifecycle
  // ---------------------------------------------------------------------

  @Widget('medbridge-consent-status')
  @Tool({
    name: 'medbridge_request_consent',
    title: 'Request Patient Consent',
    description:
      'Request patient-authorized access before reading any clinical record. This simulates the ABHA ' +
      'consent-artifact flow: it opens a time-boxed grant (default 30 minutes) scoped to specific record ' +
      'types. All other MedBridge read tools will fail with a clear error until this has been called ' +
      'for the given patientId.',
    inputSchema: z.object({
      patientId: z.string().describe('Patient ID, e.g. "P001". Use medbridge_list_patients to find valid IDs.'),
      scope: z
        .array(z.enum(['hospital_records', 'lab_reports', 'pharmacy_records', 'consent_log']))
        .default(['hospital_records', 'lab_reports', 'pharmacy_records'])
        .describe('Which record categories this consent grant covers.'),
      durationMinutes: z.number().int().min(1).max(240).default(30).describe('How long the grant stays active.'),
    }),
    outputSchema: z.object({
      patientId: z.string(),
      grantedTo: z.string(),
      scope: z.array(z.string()),
      grantedAt: z.string(),
      expiresAt: z.string(),
      summaryText: z.string().optional(),
    }),
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  })
  async requestConsent(
    input: { patientId: string; scope?: string[]; durationMinutes?: number },
    ctx: ExecutionContext
  ) {
    const actor = actorOf(ctx);
    ctx.logger.info('Requesting consent', { patientId: input.patientId });
    const grant = this.medbridge.grantConsent(
      input.patientId,
      actor,
      input.scope ?? ['hospital_records', 'lab_reports', 'pharmacy_records'],
      input.durationMinutes ?? 30
    );
    return {
      ...grant,
      summaryText: `Consent granted for ${grant.patientId} to ${grant.grantedTo}, scope [${grant.scope.join(', ')}], expires ${grant.expiresAt}.`,
    };
  }

  @Tool({
    name: 'medbridge_revoke_consent',
    title: 'Revoke Patient Consent',
    description: 'Immediately revoke any active consent grant for a patient. Logged to the audit trail.',
    inputSchema: z.object({
      patientId: z.string().describe('Patient ID, e.g. "P001".'),
    }),
    outputSchema: z.object({
      patientId: z.string(),
      revoked: z.boolean(),
      summaryText: z.string().optional(),
    }),
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: true,
      openWorldHint: false,
    },
  })
  async revokeConsent(input: { patientId: string }, ctx: ExecutionContext) {
    const actor = actorOf(ctx);
    const revoked = this.medbridge.revokeConsent(input.patientId, actor);
    return {
      patientId: input.patientId,
      revoked,
      summaryText: revoked
        ? `Consent for ${input.patientId} revoked.`
        : `No active consent grant existed for ${input.patientId}.`,
    };
  }

  // ---------------------------------------------------------------------
  // Doctor session + OTP flow (register doctor, send OTP to patient, verify OTP)
  // ---------------------------------------------------------------------

  @Tool({
    name: 'medbridge_register_doctor_session',
    title: 'Register Doctor Session',
    description: 'Create a short-lived doctor session with hospital affiliation before accessing patient records.',
    inputSchema: z.object({
      doctorName: z.string(),
      hospitalName: z.string(),
      registrationId: z.string(),
      contact: z.string(),
    }),
    outputSchema: z.object({ sessionId: z.string(), doctorName: z.string(), hospitalName: z.string(), registrationId: z.string(), contact: z.string(), createdAt: z.string() }),
  })
  async registerDoctorSession(input: { doctorName: string; hospitalName: string; registrationId: string; contact: string }, ctx: ExecutionContext) {
    ctx.logger.info('Registering doctor session', { doctorName: input.doctorName, hospitalName: input.hospitalName });
    const session = this.medbridge.registerDoctorSession(input.doctorName, input.hospitalName, input.registrationId, input.contact);
    return session;
  }

  @Tool({
    name: 'medbridge_send_patient_otp',
    title: 'Send Patient OTP',
    description: 'Send a one-time OTP to the patient mobile number. Requires a doctor session id.',
    inputSchema: z.object({ patientId: z.string(), doctorSessionId: z.string() }),
    outputSchema: z.object({ maskedMobile: z.string(), expiresAt: z.string(), devOtp: z.string().optional() }),
  })
  async sendPatientOtp(input: { patientId: string; doctorSessionId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Sending patient OTP', { patientId: input.patientId, doctorSessionId: input.doctorSessionId });
    return await this.medbridge.sendPatientOtp(input.patientId, input.doctorSessionId);
  }

  @Tool({
    name: 'medbridge_verify_patient_otp',
    title: 'Verify Patient OTP',
    description: 'Verify OTP provided by the patient to grant short-lived consent to the requesting doctor session.',
    inputSchema: z.object({ patientId: z.string(), code: z.string(), doctorSessionId: z.string(), scope: z.array(z.string()).optional(), minutes: z.number().int().optional() }),
    outputSchema: z.object({ patientId: z.string(), grantedTo: z.string(), doctorSessionId: z.string(), scope: z.array(z.string()), grantedAt: z.string(), expiresAt: z.string() }),
  })
  async verifyPatientOtp(input: { patientId: string; code: string; doctorSessionId: string; scope?: string[]; minutes?: number }, ctx: ExecutionContext) {
    ctx.logger.info('Verifying patient OTP', { patientId: input.patientId, doctorSessionId: input.doctorSessionId });
    const grant = this.medbridge.verifyPatientOtp(input.patientId, input.code, input.doctorSessionId, input.scope ?? ['hospital_records', 'lab_reports', 'pharmacy_records'], input.minutes ?? 30);
    return grant;
  }

  // ---------------------------------------------------------------------
  // Reconciliation
  // ---------------------------------------------------------------------

  @Widget('medbridge-output')
  @Tool({
    name: 'medbridge_reconcile_patient_history',
    title: 'Reconcile Patient History',
    description:
      'Pull a patient\'s records across every connected hospital, lab, and pharmacy source, cross-reference ' +
      'them, and return a single reconciled summary. Every agreed fact and every conflict is backed by a ' +
      'citation (source name + record type + date) so a clinician can verify provenance. Requires an active ' +
      'consent grant — call medbridge_request_consent first if this fails with a consent error.',
    inputSchema: z.object({
      patientId: z.string().describe('Patient ID, e.g. "P001".'),
      reason: z.string().optional().default('Clinical review').describe('Why this lookup is being performed, for the audit log.'),
    }),
    outputSchema: z.object({
      patientId: z.string(),
      agreed: z.array(z.string()),
      conflicts: z.array(z.string()),
      sourcesConsulted: z.array(z.string()),
      summaryText: z.string().optional(),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    examples: {
      request: { patientId: 'P001', reason: 'Pre-prescription review' },
      response: {
        patientId: 'P001',
        agreed: [],
        conflicts: [
          {
            field: 'allergies',
            severity: 'critical',
            description: 'Allergy status disagrees across sources.',
            sources: [
              { source: 'Hospital A', value: 'No known allergies', asOf: '2024-03-10' },
              { source: 'Hospital B', value: 'Penicillin', asOf: '2025-02-18' },
            ],
          },
        ],
        sourcesConsulted: ['Hospital A', 'Hospital B'],
      },
    },
  })
  async reconcilePatientHistory(input: { patientId: string; reason?: string }, ctx: ExecutionContext) {
    const actor = actorOf(ctx);
    return withConsent(this.medbridge, input.patientId, 'medbridge_reconcile_patient_history', actor, () => {
      this.medbridge.logAccess(input.patientId, 'medbridge_reconcile_patient_history', actor, input.reason ?? 'Clinical review');
      ctx.logger.info('Reconciling patient history', { patientId: input.patientId });
      const result = this.medbridge.reconcilePatientHistory(input.patientId);

      if (result.conflicts.some((c) => c.severity === 'critical')) {
        emitEvent('medbridge.conflict_detected', { patientId: input.patientId, conflicts: result.conflicts });
      }

      // Convert structured objects into plain strings so the UI can safely render them
      const agreedText = result.agreed.map((a) => `${a.field}: ${a.value} (sources: ${a.citations.map((c) => c.source).join(', ')})`);
      const conflictsText = result.conflicts.map((c) => `[${c.severity.toUpperCase()}] ${c.field}: ${c.description} (sources: ${c.sources
        .map((s) => `${s.source}: ${s.value}`)
        .join('; ')})`);

      return {
        patientId: result.patientId,
        agreed: agreedText,
        conflicts: conflictsText,
        sourcesConsulted: result.sourcesConsulted,
        summaryText: this.formatReconciliationSummary(result),
      };
    });
  }

  // ---------------------------------------------------------------------
  // Drug safety
  // ---------------------------------------------------------------------

  @Widget('medbridge-output')
  @Tool({
    name: 'medbridge_check_drug_safety',
    title: 'Check Drug Safety Against Full Allergy History',
    description:
      'Before prescribing a drug, check it against every allergy documented for this patient across all ' +
      'connected hospital sources — not just the record currently open — and flag any conflict with a ' +
      'concrete recommendation. Requires an active consent grant.',
    inputSchema: z.object({
      patientId: z.string().describe('Patient ID, e.g. "P001".'),
      drug: z.string().describe('Drug name to check, e.g. "amoxicillin".'),
    }),
    outputSchema: z.object({
      patientId: z.string(),
      drug: z.string(),
      safe: z.boolean(),
      conflicts: z.array(
        z.object({
          source: z.string(),
          allergyOnFile: z.string(),
          asOf: z.string(),
          recommendation: z.string(),
        })
      ),
      checkedSources: z.array(z.string()),
      summaryText: z.string().optional(),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  })
  async checkDrugSafety(input: { patientId: string; drug: string }, ctx: ExecutionContext) {
    const actor = actorOf(ctx);
    return withConsent(this.medbridge, input.patientId, 'medbridge_check_drug_safety', actor, () => {
      this.medbridge.logAccess(input.patientId, 'medbridge_check_drug_safety', actor, `Safety check before prescribing ${input.drug}`);
      ctx.logger.info('Checking drug safety', { patientId: input.patientId, drug: input.drug });
      const result = this.medbridge.checkDrugSafety(input.patientId, input.drug);

      if (!result.safe) {
        emitEvent('medbridge.drug_conflict', { patientId: input.patientId, drug: input.drug });
      }

      return { ...result, summaryText: this.formatDrugSafetySummary(result) };
    });
  }

  // ---------------------------------------------------------------------
  // Full patient summary (reconciliation + consent status + recent access, in one call)
  // ---------------------------------------------------------------------

  @Widget('medbridge-output')
  @Tool({
    name: 'medbridge_get_patient_summary',
    title: 'Get Full Patient Summary',
    description:
      'One-call clinical snapshot: reconciled history (with citations), current consent status, and the ' +
      'last few audit-log entries for this patient. Use this when you need the complete picture rather ' +
      'than calling reconcile/consent-log separately. Requires an active consent grant.',
    inputSchema: z.object({
      patientId: z.string().describe('Patient ID, e.g. "P001".'),
    }),
    outputSchema: z.object({
      patientId: z.string(),
      reconciliation: z.any(),
      consent: z.object({
        active: z.boolean(),
        grantedTo: z.string().optional(),
        expiresAt: z.string().optional(),
      }),
      recentAccess: z.array(z.string()),
      summaryText: z.string().optional(),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  })
  async getPatientSummary(input: { patientId: string }, ctx: ExecutionContext) {
    const actor = actorOf(ctx);
    return withConsent(this.medbridge, input.patientId, 'medbridge_get_patient_summary', actor, () => {
      this.medbridge.logAccess(input.patientId, 'medbridge_get_patient_summary', actor, 'Full summary view');
      const reconciliation = this.medbridge.reconcilePatientHistory(input.patientId);
      const consent = this.medbridge.getConsentStatus(input.patientId);
      const recentAccess = this.medbridge
        .getConsentLog(input.patientId)
        .slice(-3)
        .reverse()
        .map((e) => `${e.timestamp} • ${e.action} via ${e.tool} (${e.actor})`);

      return {
        patientId: input.patientId,
        reconciliation,
        consent,
        recentAccess,
        summaryText: this.formatReconciliationSummary(reconciliation),
      };
    });
  }

  // ---------------------------------------------------------------------
  // Report generation & sharing
  // ---------------------------------------------------------------------

  @Tool({
    name: 'medbridge_generate_reconciliation_report',
    title: 'Generate Reconciliation Report',
    description: 'Generate a clear, organized reconciliation report (markdown) for download and sharing. Requires an active consent grant.',
    inputSchema: z.object({ patientId: z.string(), doctorSessionId: z.string().describe('Register a doctor session first with medbridge_register_doctor_session and pass sessionId'), reason: z.string().optional() }).strict(),
    outputSchema: z.object({ reportId: z.string(), patientId: z.string(), generatedAt: z.string(), markdown: z.string(), shared: z.boolean() }),
  })
  async generateReconciliationReport(input: { patientId: string; doctorSessionId: string; reason?: string }, ctx: ExecutionContext) {
    const actor = actorOf(ctx);
    return withConsent(this.medbridge, input.patientId, 'medbridge_generate_reconciliation_report', actor, () => {
      this.medbridge.logAccess(input.patientId, 'medbridge_generate_reconciliation_report', actor, input.reason ?? 'Report generation');
      // generateReport validates the doctor session and returns a structured report
      return this.medbridge.generateReport(input.patientId, input.doctorSessionId);
    });
  }

  @Tool({
    name: 'medbridge_list_reports',
    title: 'List Reconciliation Reports',
    description: 'List generated reconciliation reports (for a patient or all).',
    inputSchema: z.object({ patientId: z.string().optional() }).strict(),
    outputSchema: z.object({ reports: z.array(z.object({ reportId: z.string(), patientId: z.string(), generatedAt: z.string(), shared: z.boolean() })) }),
  })
  async listReports(input: { patientId?: string }, ctx: ExecutionContext) {
    const reports = this.medbridge.listReports(input.patientId);
    return { reports };
  }

  @Tool({
    name: 'medbridge_get_report',
    title: 'Get Reconciliation Report',
    description: 'Fetch a previously generated reconciliation report by id.',
    inputSchema: z.object({ reportId: z.string() }),
    outputSchema: z.object({ report: z.any() }),
  })
  async getReport(input: { reportId: string }, ctx: ExecutionContext) {
    const report = this.medbridge.findReport(input.reportId);
    if (!report) throw new Error(`Unknown report ${input.reportId}`);
    return { report };
  }

  @Tool({
    name: 'medbridge_share_report',
    title: 'Share Reconciliation Report',
    description: 'Share a reconciliation report by sending it to the patient email (or other recipient).',
    inputSchema: z.object({ reportId: z.string(), recipientEmail: z.string().optional(), message: z.string().optional() }),
    outputSchema: z.object({ reportId: z.string(), shared: z.boolean() }),
  })
  async shareReport(input: { reportId: string; recipientEmail?: string; message?: string }, ctx: ExecutionContext) {
    // Sharing a report does not require patient consent (it is an explicit share action) but requires doctor session / actor context.
    const actor = actorOf(ctx);
    ctx.logger.info('Sharing report', { reportId: input.reportId, recipient: input.recipientEmail, by: actor });
    const report = await this.medbridge.shareReport(input.reportId, actor, input.recipientEmail, input.message ?? '');
    return { reportId: report.reportId, shared: report.shared };
  }

  // ---------------------------------------------------------------------
  // Agentic / auxiliary tools
  // ---------------------------------------------------------------------

  @Tool({
    name: 'medbridge_run_agent_review',
    title: 'Run Agent Review (LLM-style Summary)',
    description: 'Run an LLM-assisted review that summarizes reconciled findings, key risks, and recommended actions (mocked in-demo). Requires consent.',
    inputSchema: z.object({ patientId: z.string() }),
    outputSchema: z.object({ patientId: z.string(), conciseSummary: z.string(), keyRisks: z.array(z.string()), recommendedActions: z.array(z.string()) }),
  })
  async runAgentReview(input: { patientId: string }, ctx: ExecutionContext) {
    const actor = actorOf(ctx);
    return withConsent(this.medbridge, input.patientId, 'medbridge_run_agent_review', actor, () => {
      this.medbridge.logAccess(input.patientId, 'medbridge_run_agent_review', actor, 'Agentic summary requested');
      return this.medbridge.runAgentReview(input.patientId);
    });
  }

  @Tool({
    name: 'medbridge_export_for_referral',
    title: 'Export Referral Packet',
    description: 'Export a concise referral packet (markdown) including reconciled summary and attachments to share with specialists. Requires consent.',
    inputSchema: z.object({ patientId: z.string(), reason: z.string().describe('Reason for referral') }),
    outputSchema: z.object({ patientId: z.string(), referralMarkdown: z.string() }),
  })
  async exportForReferral(input: { patientId: string; reason: string }, ctx: ExecutionContext) {
    const actor = actorOf(ctx);
    return withConsent(this.medbridge, input.patientId, 'medbridge_export_for_referral', actor, () => {
      this.medbridge.logAccess(input.patientId, 'medbridge_export_for_referral', actor, input.reason ?? 'Referral packet');
      return this.medbridge.exportForReferral(input.patientId, input.reason);
    });
  }

  // ---------------------------------------------------------------------
  // Consent log (audit trail — does NOT require consent, since viewing the
  // audit trail itself is how a compliance reviewer would check for misuse)
  // ---------------------------------------------------------------------

  @Widget('medbridge-consent-log')
  @Tool({
    name: 'medbridge_get_consent_log',
    title: 'Get Patient Data Access Log',
    description:
      'Return the full audit trail for this patient — every access, every consent grant, every revocation, ' +
      'and every denied attempt — with who, when, through which tool, and why. This tool itself is not ' +
      'consent-gated so that access can always be audited.',
    inputSchema: z.object({
      patientId: z.string().describe('Patient ID, e.g. "P001".'),
    }),
    outputSchema: z.object({
      patientId: z.string(),
      entries: z.array(
        z.object({
          patientId: z.string(),
          timestamp: z.string(),
          actor: z.string(),
          action: z.string(),
          tool: z.string(),
          reason: z.string(),
        })
      ),
      summaryText: z.string().optional(),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  })
  async getConsentLog(input: { patientId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching consent log', { patientId: input.patientId });
    const entries = this.medbridge.getConsentLog(input.patientId);
    return {
      patientId: input.patientId,
      entries,
      summaryText: this.formatConsentLogSummary(entries),
    };
  }

  // ---------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------

  private formatReconciliationSummary(result: ReconciliationResult) {
    const lines = [
      `Patient ${result.patientId} — reconciled across ${result.sourcesConsulted.join(', ')}`,
      result.conflicts.length ? `${result.conflicts.length} conflict(s) found` : 'No conflicts detected',
    ];
    if (result.conflicts.length) {
      lines.push(...result.conflicts.map((c) => `- [${c.severity.toUpperCase()}] ${c.field}: ${c.description}`));
    }
    if (result.agreed.length) {
      lines.push('Agreed findings:');
      lines.push(...result.agreed.map((a) => `- ${a.field}: ${a.value} (source: ${a.citations.map((c) => c.source).join(', ')})`));
    }
    return lines.join('\n');
  }

  private formatDrugSafetySummary(result: DrugCheckResult) {
    const header = `Drug safety check for ${result.patientId} / ${result.drug}\nSafe: ${result.safe ? 'Yes' : 'No'}\nChecked sources: ${
      result.checkedSources.join(', ') || 'None'
    }`;
    if (!result.conflicts.length) return `${header}\n\nNo conflicts found.`;
    const rows = result.conflicts.map((c) => `${c.source} | ${c.allergyOnFile} | ${c.asOf} | ${c.recommendation}`).join('\n');
    return `${header}\n\nConflicts:\nSource | Allergy on file | Date | Recommendation\n${rows}`;
  }

  private formatConsentLogSummary(entries: ConsentLogEntry[]) {
    if (!entries.length) return 'No consent log entries found for this patient.';
    const lines = [`Consent log for ${entries[0].patientId}`, `Total entries: ${entries.length}`, '', 'Recent:'];
    lines.push(...entries.slice(-5).reverse().map((e) => `- ${e.timestamp} • ${e.action} via ${e.tool} (${e.actor}): ${e.reason}`));
    return lines.join('\n');
  }
}