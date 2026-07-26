import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { HospitalDataService } from './hospital.data.service.js';

/**
 * Hospital Agent — case/history/plan entry, cost estimates from CGHS data.
 * Tools stay thin: they validate input, call the service, and return the result.
 *
 * @Injectable({ deps: [...] }) is used (not just @Injectable()) because ESM builds
 * can't reliably read constructor parameter types at runtime — explicit deps
 * removes the guesswork.
 */
@Injectable({ deps: [HospitalDataService] })
export class HospitalTools {
  constructor(private hospitalData: HospitalDataService) {}

  @Tool({
    name: 'get_treatment_estimate',
    description: 'Get the official CGHS rate estimate for a procedure in a given city',
    inputSchema: z.object({
      procedureCode: z.string().describe('CGHS procedure code, e.g. CGHS-CARD-001'),
      city: z.string().describe('City where the procedure will be performed')
    })
  })
  @Widget('treatment-estimate')
  async getTreatmentEstimate(input: { procedureCode: string; city: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching treatment estimate', input);
    const estimate = this.hospitalData.getEstimate(input.procedureCode, input.city);

    if (!estimate) {
      return {
        found: false,
        message: `No CGHS rate found for ${input.procedureCode} in ${input.city}`
      };
    }

    return {
      found: true,
      procedureCode: estimate.code,
      procedure: estimate.procedure,
      city: estimate.city,
      estimatedCost: estimate.cghsRate,
      currency: estimate.currency
    };
  }

  @Tool({
    name: 'list_city_procedures',
    description: 'List all CGHS-rated procedures available for a city',
    inputSchema: z.object({
      city: z.string().describe('City to look up')
    })
  })
  @Widget('city-procedures')
  async listCityProcedures(input: { city: string }, ctx: ExecutionContext) {
    ctx.logger.info('Listing procedures for city', input);
    const procedures = this.hospitalData.listProceduresForCity(input.city);
    return { city: input.city, count: procedures.length, procedures };
  }
}
