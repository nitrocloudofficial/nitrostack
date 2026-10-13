import { Module } from '@nitrostack/core';
import { JourneyTools } from './journey.tools.js';
import { ConciergeService } from './concierge.service.js';
import { MultiStopService } from './multi-stop.service.js';
import { PoolingService } from './pooling.service.js';
import { BookingService } from './booking.service.js';
import { SafetyService } from './safety.service.js';
import { MapsService } from '../../services/maps.service.js';
import { RideSearchService } from '../../services/ride-search.service.js';
import { RankingService } from '../../services/ranking.service.js';
import { ForecastService } from '../../services/forecast.service.js';
import { SearchStoreService } from '../../services/search-store.service.js';

/**
 * JourneyModule
 *
 * Phase 3 — the intelligent mobility copilot layer on top of RidesModule:
 * travel concierge (deadline-driven trip planning), ride-later fare
 * forecasting, multi-stop trip planning, pooling simulation, SOS safety
 * simulation, and booking lifecycle simulation. Reuses RideSearchService,
 * MapsService, RankingService, ForecastService, and SearchStoreService
 * from the rider side rather than re-implementing route/fare logic.
 */
@Module({
  name: 'journey',
  description: 'Travel concierge, fare forecasting, multi-stop planning, pooling, safety, and booking simulation',
  controllers: [JourneyTools],
  providers: [
    ConciergeService,
    MultiStopService,
    PoolingService,
    BookingService,
    SafetyService,
    // These are already provided by RidesModule; re-listing is safe (see
    // DriverModule's note) — the global DI container resolves to the same
    // singleton instances rather than creating duplicates.
    MapsService,
    RideSearchService,
    RankingService,
    ForecastService,
    SearchStoreService,
  ],
})
export class JourneyModule {}
