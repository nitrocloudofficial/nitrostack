import { Module } from '@nitrostack/core';
import { DriverTools } from './driver.tools.js';
import { DriverService } from './driver.service.js';
import { ProfitabilityService } from './profitability.service.js';
import { DemandService } from './demand.service.js';
import { RecommendationService } from './recommendation.service.js';
import { NearbyRidesService } from './nearby-rides.service.js';
import { MapsService } from '../../services/maps.service.js';

/**
 * DriverModule
 *
 * Phase 2 — Driver Intelligence Module. Advisory-only assistant that helps
 * drivers decide whether to accept a ride, understand trip profitability,
 * gauge destination demand, and choose where to go next. Phase 3 adds the
 * simulated nearby ride-request marketplace. No bookings, no driver
 * accounts. Reuses MapsService from the rider side rather than
 * re-implementing geocoding.
 */
@Module({
  name: 'driver',
  description: 'Driver intelligence: trip profitability, demand estimation, zone suggestions, earnings summaries, nearby ride marketplace',
  controllers: [DriverTools],
  providers: [
    DriverService,
    ProfitabilityService,
    DemandService,
    RecommendationService,
    NearbyRidesService,
    // MapsService is already provided by RidesModule, but NitroStack's DI
    // container is a single global registry (see container.d.ts), so
    // listing it again here is safe — it resolves to the same singleton,
    // it does not create a second instance.
    MapsService,
  ],
})
export class DriverModule {}
