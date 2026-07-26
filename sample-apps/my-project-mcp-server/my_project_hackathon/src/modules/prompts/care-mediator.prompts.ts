import { PromptDecorator as Prompt, Injectable, ExecutionContext } from '@nitrostack/core';
import { CaseStoreService, type LiveCaseData } from '../shared/case-store.service.js';

/**
 * Care Mediator Prompts
 *
 * Reusable, data-grounded conversation starters for the three roles this
 * server serves. Each prompt fetches the live case (or case list) from the
 * backend and embeds the real figures directly in the returned message —
 * an LLM working from one of these already has the numbers it needs instead
 * of having to guess which tool to call first.
 */
@Injectable({ deps: [CaseStoreService] })
export class CareMediatorPrompts {
  constructor(private caseStore: CaseStoreService) {}

  private async loadCase(caseId: string, ctx: ExecutionContext): Promise<LiveCaseData | null> {
    try {
      return await this.caseStore.getCase(caseId);
    } catch (err) {
      ctx.logger.warn(`Prompt could not load case ${caseId}`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  private notFoundMessage(caseId: string) {
    return {
      role: 'user' as const,
      content:
        `I tried to load Care Mediator case "${caseId}" but the backend didn't have it ` +
        `(it may not exist, or the backend at BACKEND_API_URL isn't running). ` +
        `Call list_cases to see what's actually available, then ask me again with a real caseId.`,
    };
  }

  @Prompt({
    name: 'audit_new_claim',
    description:
      'Walk through a full objectivity audit of a submitted case: CGHS rate comparison, ' +
      'policy-terms check, and a clear verdict on whether it is safe for the insurer to review as-is.',
    arguments: [
      { name: 'caseId', description: 'Care Mediator case ID, e.g. "clean-case" or "gotcha-case"', required: true },
    ],
  })
  async auditNewClaim(args: { caseId: string }, ctx: ExecutionContext) {
    const c = await this.loadCase(args.caseId, ctx);
    if (!c) return this.notFoundMessage(args.caseId);

    const flagsList = c.objectivityReport.flags.length
      ? c.objectivityReport.flags.map((f) => `- ${f}`).join('\n')
      : '- None — the submission is clean.';

    return {
      role: 'user' as const,
      content:
        `Audit Care Mediator case ${c.caseId} (${c.patientName}, ${c.hospitalName}, ${c.procedure}) ` +
        `before it goes to the insurer.\n\n` +
        `Hospital estimate: ₹${c.hospitalEstimate.toLocaleString('en-IN')}\n` +
        `Objectivity summary: ${c.objectivityReport.summary}\n` +
        `Flags raised:\n${flagsList}\n\n` +
        `Coverage: ${c.coverageExplainer.covered ? 'covered' : 'NOT covered'} up to ` +
        `₹${c.coverageExplainer.coverageLimit.toLocaleString('en-IN')}, waiting period ` +
        `${c.coverageExplainer.waitingPeriodCleared ? 'cleared' : 'NOT cleared'}, network status ` +
        `${c.coverageExplainer.networkStatus}, exclusions: ` +
        `${c.coverageExplainer.exclusionsApplicable.join(', ') || 'none'}.\n\n` +
        `Using this data (call build_objective_case_report or reconcile_case_by_id only if you need ` +
        `to re-verify something), give me: (1) a one-line verdict — safe to send to the insurer as-is, ` +
        `or needs correction first — and (2) if it needs correction, exactly what to fix before resubmitting.`,
    };
  }

  @Prompt({
    name: 'explain_decision_to_patient',
    description:
      'Turn a claim decision into a plain-language explanation a worried, non-expert patient can ' +
      'actually understand — what was approved, what the gap is, and what their options are.',
    arguments: [
      { name: 'caseId', description: 'Care Mediator case ID', required: true },
    ],
  })
  async explainDecisionToPatient(args: { caseId: string }, ctx: ExecutionContext) {
    const c = await this.loadCase(args.caseId, ctx);
    if (!c) return this.notFoundMessage(args.caseId);

    const financing =
      c.gap > 0
        ? `The insurer's financing partner is offering: ${c.loanOffers
            .map((o) => `${o.lenderName} at ${o.apr}% APR${o.flagged ? ' (flagged — avoid this one)' : ''}`)
            .join('; ')}. The recommended option is ${c.recommendedOffer.lenderName} at ${c.recommendedOffer.apr}% APR.`
        : `There is no out-of-pocket gap, so no financing is needed.`;

    return {
      role: 'user' as const,
      content:
        `Explain this claim decision to ${c.patientName} the way you'd explain it to a worried family ` +
        `member — warm, plain language, no insurance jargon, no hedging.\n\n` +
        `Status: ${c.claimStatus}${c.denialReason ? ` — reason given: "${c.denialReason}"` : ''}\n` +
        `Hospital billed: ₹${c.hospitalEstimate.toLocaleString('en-IN')}\n` +
        `Insurer approved: ₹${c.insurerApproved.toLocaleString('en-IN')}\n` +
        `Out-of-pocket gap: ₹${c.gap.toLocaleString('en-IN')}\n` +
        `${financing}\n\n` +
        `End with one clear sentence on what ${c.patientName} should do next (nothing, pay the gap, ` +
        `take financing, or report an issue if something looks wrong).`,
    };
  }

  @Prompt({
    name: 'draft_grievance_response',
    description:
      'Draft a professional, policy-grounded response to a patient who has disputed or questioned a ' +
      'claim decision — for the insurer or grievance officer to review before sending.',
    arguments: [
      { name: 'caseId', description: 'Care Mediator case ID', required: true },
      {
        name: 'patientConcern',
        description:
          "What the patient is disputing, in their own words. If omitted, the most recent patient/system " +
          'timeline entry on the case is used instead.',
        required: false,
      },
    ],
  })
  async draftGrievanceResponse(
    args: { caseId: string; patientConcern?: string },
    ctx: ExecutionContext
  ) {
    const c = await this.loadCase(args.caseId, ctx);
    if (!c) return this.notFoundMessage(args.caseId);

    const concern =
      args.patientConcern?.trim() ||
      [...c.timeline].reverse().find((e) => e.actor === 'patient' || e.actor === 'system')?.event ||
      'No specific concern was recorded — respond to the case status in general.';

    return {
      role: 'user' as const,
      content:
        `Draft a response from the insurer to ${c.patientName} regarding case ${c.caseId}.\n\n` +
        `Patient's concern: "${concern}"\n\n` +
        `Grounding facts to cite accurately (do not contradict these):\n` +
        `- Claim status: ${c.claimStatus}${c.denialReason ? `, reason: "${c.denialReason}"` : ''}\n` +
        `- Objectivity check: ${c.objectivityReport.summary}${
          c.objectivityReport.flags.length ? ` Flags: ${c.objectivityReport.flags.join('; ')}` : ''
        }\n` +
        `- Policy coverage: limit ₹${c.coverageExplainer.coverageLimit.toLocaleString('en-IN')}, ` +
        `waiting period ${c.coverageExplainer.waitingPeriodCleared ? 'cleared' : 'not cleared'}, ` +
        `exclusions: ${c.coverageExplainer.exclusionsApplicable.join(', ') || 'none'}\n\n` +
        `Write it professional but empathetic — acknowledge the concern before explaining the policy ` +
        `basis for the decision, and mention the state insurance ombudsman as an escalation path if the ` +
        `patient still disagrees after reading it.`,
    };
  }

  @Prompt({
    name: 'compare_financing_offers',
    description:
      "Recommend the best financing option for a patient's coverage gap on a specific case, explaining " +
      'true cost (not flat APR) and clearly calling out predatory offers.',
    arguments: [
      { name: 'caseId', description: 'Care Mediator case ID', required: true },
    ],
  })
  async compareFinancingOffers(args: { caseId: string }, ctx: ExecutionContext) {
    const c = await this.loadCase(args.caseId, ctx);
    if (!c) return this.notFoundMessage(args.caseId);

    if (c.gap <= 0) {
      return {
        role: 'user' as const,
        content:
          `Case ${c.caseId} (${c.patientName}) has zero coverage gap (insurer approved the full ` +
          `₹${c.insurerApproved.toLocaleString('en-IN')} estimate) — confirm to me in one sentence that ` +
          `no financing is needed and there is nothing further to compare.`,
      };
    }

    const offersList = c.loanOffers
      .map(
        (o) =>
          `- ${o.lenderName}: ${o.apr}% APR, ₹${o.amount.toLocaleString('en-IN')}` +
          `${o.flagged ? ` — FLAGGED: ${o.flagReason ?? 'predatory terms'}` : ''}`
      )
      .join('\n');

    return {
      role: 'user' as const,
      content:
        `${c.patientName} has a ₹${c.gap.toLocaleString('en-IN')} coverage gap on case ${c.caseId} and ` +
        `needs financing. Available offers:\n${offersList}\n\n` +
        `Care Mediator's own recommendation is ${c.recommendedOffer.lenderName} at ` +
        `${c.recommendedOffer.apr}% APR. Confirm whether you agree, using effective cost (not just the ` +
        `flat APR) as your reasoning, and write two sentences ${c.patientName} could actually read and ` +
        `act on — plainly say to avoid any offer flagged as predatory and why.`,
    };
  }

  @Prompt({
    name: 'daily_insurer_triage',
    description:
      'Produce a prioritized worklist for an insurer reviewing every case currently on the backend — ' +
      'which ones need attention today and why, ranked by urgency.',
    arguments: [],
  })
  async dailyInsurerTriage(_args: Record<string, never>, ctx: ExecutionContext) {
    let cases: LiveCaseData[];
    try {
      cases = await this.caseStore.listCases();
    } catch (err) {
      ctx.logger.warn('daily_insurer_triage could not reach the backend', {
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        role: 'user' as const,
        content:
          'The Care Mediator backend is unreachable right now, so there is no case list to triage. ' +
          'Tell me that plainly and suggest checking that backend/ (npm run dev, port 4000) is running.',
      };
    }

    if (cases.length === 0) {
      return {
        role: 'user' as const,
        content: 'There are no cases on the backend yet — nothing to triage. Say so in one sentence.',
      };
    }

    const summary = cases
      .map(
        (c) =>
          `- ${c.caseId} (${c.patientName}): status=${c.claimStatus}, gap=₹${c.gap.toLocaleString('en-IN')}, ` +
          `flags=${c.objectivityReport.flags.length}`
      )
      .join('\n');

    return {
      role: 'user' as const,
      content:
        `Here is every case currently on the Care Mediator backend:\n${summary}\n\n` +
        `Rank them into a prioritized worklist for an insurer starting their day. Pending cases with ` +
        `objectivity flags or a large gap should rank above already-decided ones. For each item in your ` +
        `list, give the caseId and a one-line reason it's at that priority. Cases already approved with ` +
        `zero flags and zero gap need no action — group those at the bottom as "no action needed."`,
    };
  }
}
