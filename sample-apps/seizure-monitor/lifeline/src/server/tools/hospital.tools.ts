import { ToolDecorator as Tool, ControllerDecorator as Controller, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { HospitalService } from '../services/hospital.service.js';
import { DEFAULT_SEARCH_RADIUS_KM } from '../shared/constants.js';

const nearbyHospitalsSchema = z.object({
  latitude: z.number().min(-90).max(90).describe('Latitude of the emergency location'),
  longitude: z.number().min(-180).max(180).describe('Longitude of the emergency location'),
  radius_km: z.number().positive().optional().describe('Search radius in kilometers (default 50)'),
  required_capability: z
    .string()
    .optional()
    .describe('Required hospital capability/department, e.g. "Trauma Level 1"'),
});
type NearbyHospitalsInput = z.infer<typeof nearbyHospitalsSchema>;

const hospitalIdSchema = z.object({
  hospital_id: z.string().min(1).describe('Hospital identifier, e.g. "HOSP-001"'),
});
type HospitalIdInput = z.infer<typeof hospitalIdSchema>;

// Stacking @Injectable({ deps }) on a @Controller is required for constructor
// injection to work under `nitrostack-cli dev` (tsx/esbuild): tsx does not
// emit emitDecoratorMetadata, so the DI container has no design:paramtypes,
// and @Controller itself has no `deps` option. @Injectable's explicit `deps`
// is the only mechanism the container's dependency resolver honors when
// design:paramtypes is absent (verified — @Inject() alone does not work here,
// since the container merges it by iterating design:paramtypes, which is empty).
@Controller()
@Injectable({ deps: [HospitalService] })
export class HospitalTools {
  constructor(private readonly hospitalService: HospitalService) {}

  @Tool({
    name: 'get_nearby_hospitals',
    description:
      'Find hospitals within a given radius of an emergency location, optionally filtered by a required capability (e.g. "Trauma Level 1").',
    inputSchema: nearbyHospitalsSchema,
    examples: {
      request: { latitude: 11.0016, longitude: 76.9628, radius_km: 25, required_capability: 'Trauma Level 1' },
    },
  })
  async getNearbyHospitals(input: NearbyHospitalsInput, ctx: ExecutionContext) {
    const radiusKm = input.radius_km ?? DEFAULT_SEARCH_RADIUS_KM;
    ctx.logger.info('Searching nearby hospitals', {
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm,
      requiredCapability: input.required_capability ?? null,
    });

    const hospitals = this.hospitalService.getNearby(
      input.latitude,
      input.longitude,
      radiusKm,
      input.required_capability
    );

    return {
      hospitals,
      count: hospitals.length,
      search_radius_km: radiusKm,
    };
  }

  @Tool({
    name: 'get_hospital_capabilities',
    description: 'Get the medical specialization capabilities, languages, and verification status of a specific hospital.',
    inputSchema: hospitalIdSchema,
  })
  async getHospitalCapabilities(input: HospitalIdInput, ctx: ExecutionContext) {
    ctx.logger.info('Fetching hospital capabilities', { hospitalId: input.hospital_id });
    return this.hospitalService.getCapabilities(input.hospital_id);
  }

  @Tool({
    name: 'check_resource_availability',
    description: 'Check real-time ER bed, ICU bed, and estimated wait time availability for a specific hospital.',
    inputSchema: hospitalIdSchema,
  })
  async checkResourceAvailability(input: HospitalIdInput, ctx: ExecutionContext) {
    ctx.logger.info('Checking resource availability', { hospitalId: input.hospital_id });
    return this.hospitalService.checkAvailability(input.hospital_id);
  }
}
