import { Module } from '@nitrostack/core';
import { RidesTools } from './rides.tools.js';
import { MapsService } from '../../services/maps.service.js';
import { RankingService } from '../../services/ranking.service.js';
import { PreferenceService } from '../../services/preference.service.js';
import { SearchStoreService } from '../../services/search-store.service.js';
import { ForecastService } from '../../services/forecast.service.js';
import { NearbyDriversService } from '../../services/nearby-drivers.service.js';
import { RideSearchService } from '../../services/ride-search.service.js';
import { UberMockProvider } from '../../providers/uber-mock.provider.js';
import { OlaMockProvider } from '../../providers/ola-mock.provider.js';
import { RapidoHybridProvider } from '../../providers/rapido-hybrid.provider.js';

/**
 * RidesModule
 *
 * Customer ride intelligence assistant — Phase 1 scope only:
 * discovery, comparison, recommendation, preferences, nearby-driver
 * visualization, and return-fare forecasting. No driver mode, booking,
 * payments, scheduling, or accounts.
 */
@Module({
  name: 'rides',
  description: 'Customer ride discovery, comparison, recommendation, and forecasting',
  controllers: [RidesTools],
  providers: [
    MapsService,
    RankingService,
    PreferenceService,
    SearchStoreService,
    ForecastService,
    NearbyDriversService,
    RideSearchService,
    UberMockProvider,
    OlaMockProvider,
    RapidoHybridProvider,
  ],
})
export class RidesModule {}
