import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { HospitalDataService } from '../hospital/hospital.data.service.js';
import { InsurerDataService } from '../insurer/insurer.data.service.js';

/**
 * Case Objectivity Agent — turns the hospital's raw entry into an
 * insurer-ready, inconsistency-checked report. This is the piece that removes
 * "he said / she said" between hospital billing and insurer claim review.
 */
@Injectable({ deps: [HospitalDataService, InsurerDataService] })
export class ObjectivityTools {
  constructor(
    private hospitalData: HospitalDataService,
    private insurerData: InsurerDataService
  ) {}

  @Tool({
    name: 'build_objective_case_report',
    description:
      'Cross-check a hospital case entry against CGHS rates and the insurer claim record, flagging any inconsistency',
    inputSchema: z.object({
      patientId: z.string(),
      procedureCode: z.string(),
      city: z.string(),
      hospitalBilledAmount: z.number().describe('What the hospital is actually billing')
    })
  })
  @Widget('objectivity-report')
  async buildObjectiveCaseReport(
    input: { patientId: string; procedureCode: string; city: string; hospitalBilledAmount: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Building objective case report', input);

    const estimate = this.hospitalData.getEstimate(input.procedureCode, input.city);
    const claim = this.insurerData.getClaimByPatient(input.patientId);

    const inconsistencies: string[] = [];

    if (!estimate) {
      inconsistencies.push(`No official CGHS rate on file for ${input.procedureCode} in ${input.city}`);
    } else if (input.hospitalBilledAmount > estimate.cghsRate * 1.5) {
      inconsistencies.push(
        `Billed amount (₹${input.hospitalBilledAmount}) is more than 50% over the CGHS rate (₹${estimate.cghsRate})`
      );
    }

    if (!claim) {
      inconsistencies.push(`No matching insurer claim record for patient ${input.patientId}`);
    } else if (claim.procedureCode !== input.procedureCode) {
      inconsistencies.push(
        `Insurer claim lists procedure ${claim.procedureCode}, hospital entry lists ${input.procedureCode}`
      );
    }

    return {
      patientId: input.patientId,
      procedureCode: input.procedureCode,
      cghsBenchmark: estimate?.cghsRate ?? null,
      hospitalBilledAmount: input.hospitalBilledAmount,
      insurerClaim: claim
        ? { claimId: claim.claimId, cashlessStatus: claim.cashlessStatus, approvedAmount: claim.approvedAmount }
        : null,
      isConsistent: inconsistencies.length === 0,
      inconsistencies
    };
  }
}
