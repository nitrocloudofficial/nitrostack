import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { ObjectivityTools } from '../objectivity/objectivity.tools.js';
import { LenderDataService } from '../lender/lender.data.service.js';
import { CaseStoreService, toCaseSummary } from '../shared/case-store.service.js';

/**
 * Orchestrator Agent Tools
 *
 * - reconcile_case         : builds the shared case record from raw inputs (no backend needed —
 *                            works with CGHS mock data, useful for "what-if" LLM queries)
 * - reconcile_case_by_id   : fetches a LIVE case from the backend by caseId and returns the
 *                            same reconciled shape, so the LLM always reads a consistent
 *                            structure regardless of whether it's working from raw inputs
 *                            or an already-submitted case
 * - list_cases             : lists all cases currently stored in the backend
 */
@Injectable({ deps: [ObjectivityTools, LenderDataService, CaseStoreService] })
export class OrchestratorTools {
  constructor(
    private objectivity: ObjectivityTools,
    private lenderData: LenderDataService,
    private caseStore: CaseStoreService,
  ) {}

  @Tool({
    name: 'reconcile_case',
    description:
      'Build the single shared case record from raw inputs: objective CGHS report + ' +
      'coverage gap + (if needed) loan options. ' +
      'Use this for "what-if" queries where you have raw numbers but no submitted caseId. ' +
      'For a real submitted case use reconcile_case_by_id instead.',
    inputSchema: z.object({
      patientId: z.string(),
      procedureCode: z.string(),
      city: z.string(),
      hospitalBilledAmount: z.number(),
    }),
    // Optional task support: a client may run this as a tracked task to get
    // progress updates across the three real stages below (objectivity check,
    // gap computation, financing lookup). A plain synchronous call still
    // works unchanged — ctx.task is only populated for task-augmented calls.
    taskSupport: 'optional',
  })
  @Widget('objectivity-report')
  async reconcileCase(
    input: { patientId: string; procedureCode: string; city: string; hospitalBilledAmount: number },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Reconciling case from raw inputs', input);

    ctx.task?.updateProgress('Checking hospital estimate against CGHS rates and insurer claim…');
    ctx.task?.throwIfCancelled();
    const report = await this.objectivity.buildObjectiveCaseReport(input, ctx);

    ctx.task?.updateProgress('Computing coverage gap…');
    ctx.task?.throwIfCancelled();
    const approvedAmount = report.insurerClaim?.approvedAmount ?? 0;
    const gap = Math.max(0, input.hospitalBilledAmount - approvedAmount);

    let financingOptions: unknown = null;
    if (gap > 0) {
      ctx.task?.updateProgress('Gap found — looking up financing offers…');
      ctx.task?.throwIfCancelled();
      const offers = this.lenderData.getAllOffers();
      financingOptions = [...offers]
        .sort((a, b) => a.effectiveAnnualRate - b.effectiveAnnualRate)
        .slice(0, 3);
    }

    return {
      patientId: input.patientId,
      procedureCode: input.procedureCode,
      city: input.city,
      isConsistent: report.isConsistent,
      inconsistencies: report.inconsistencies,
      hospitalBilledAmount: input.hospitalBilledAmount,
      cghsBenchmark: report.cghsBenchmark,
      insurerClaim: report.insurerClaim,
      coverageGap: gap,
      financingNeeded: gap > 0,
      financingOptions,
    };
  }

  @Tool({
    name: 'reconcile_case_by_id',
    description:
      'Fetch a real submitted case from the Care Mediator backend by caseId and return the ' +
      'full reconciled view: claim status, objectivity report, coverage explainer, gap, and ' +
      'loan offers. This is the primary tool for reviewing any case that has already been ' +
      'submitted through the hospital portal.',
    inputSchema: z.object({
      caseId: z
        .string()
        .describe('Care Mediator case ID, e.g. "clean-case", "gotcha-case", or a CM-xxxxx ID'),
    }),
  })
  @Widget('case-summary')
  async reconcileCaseById(input: { caseId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Reconciling live case by ID', input);
    const c = await this.caseStore.getCase(input.caseId);
    return toCaseSummary(c);
  }

  @Tool({
    name: 'list_cases',
    description:
      'List all cases currently stored in the Care Mediator backend (newest first). ' +
      'Returns a summary of each case: caseId, patient, hospital, procedure, status, and gap.',
    inputSchema: z.object({}),
  })
  @Widget('case-queue')
  async listCases(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Listing all live cases from backend');
    const cases = await this.caseStore.listCases();

    return {
      count: cases.length,
      cases: cases.map((c) => ({
        caseId: c.caseId,
        patientName: c.patientName,
        hospitalName: c.hospitalName,
        procedure: c.procedure,
        submittedAt: c.submittedAt,
        claimStatus: c.claimStatus,
        hospitalEstimate: c.hospitalEstimate,
        insurerApproved: c.insurerApproved,
        gap: c.gap,
      })),
    };
  }
}
