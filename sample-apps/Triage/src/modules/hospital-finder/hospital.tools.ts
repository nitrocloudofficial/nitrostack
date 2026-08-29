// src/modules/hospital-finder/hospital.tools.ts
import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { HospitalService } from './hospital.service.js';

const FindHospitalSchema = z.object({
  lat: z.number().describe('Patient current latitude'),
  lng: z.number().describe('Patient current longitude'),
  specialty: z.string().optional().describe('Preferred specialty, e.g. cardiology'),
  emergencyOnly: z.boolean().optional().default(true)
});

@Injectable({ deps: [HospitalService] })
export class HospitalTools {
  constructor(private readonly hospitalService: HospitalService) {}

  @Tool({
    name: 'find_nearest_hospital',
    description: 'Find nearest suitable hospital given patient coordinates, optional specialty and emergency-readiness filter. Returns ranked list, nearest first.',
    inputSchema: FindHospitalSchema
  })
  async findNearestHospital(args: z.infer<typeof FindHospitalSchema>, ctx: ExecutionContext) {
    const results = this.hospitalService.findNearest(
      args.lat, args.lng, args.emergencyOnly, args.specialty
    );

    ctx.logger.info('Hospital search', { lat: args.lat, lng: args.lng, found: results.length });

    return {
      count: results.length,
      hospitals: results.slice(0, 5) // top 5
    };
  }
}