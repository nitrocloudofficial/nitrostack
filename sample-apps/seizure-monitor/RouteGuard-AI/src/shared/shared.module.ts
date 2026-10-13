import { Module } from '@nitrostack/core';
import { CacheService } from './services/cache.service.js';
import { DatabaseService } from './services/database.service.js';
import { CarrierRatesService } from './services/carrier-rates.service.js';
import { ERPService } from './services/erp.service.js';
import { NewsAPIService } from './services/newsapi.service.js';
import { OpenWeatherService } from './services/openweather.service.js';

/**
 * Shared Module
 * Provides all cross-cutting infrastructure services:
 * - CacheService       (in-memory / Redis)
 * - DatabaseService    (in-memory / PostgreSQL)
 * - CarrierRatesService (mock rates / real carrier APIs)
 * - ERPService         (shipment data layer)
 * - NewsAPIService     (supply-chain news feed)
 * - OpenWeatherService (port weather alerts)
 *
 * Import SharedModule into any feature module that needs these services.
 */
@Module({
  name: 'shared',
  description: 'Shared infrastructure services — cache, database, ERP, carrier rates, external APIs',
  providers: [
    CacheService,
    DatabaseService,
    CarrierRatesService,
    ERPService,
    NewsAPIService,
    OpenWeatherService,
  ],
  exports: [
    CacheService,
    DatabaseService,
    CarrierRatesService,
    ERPService,
    NewsAPIService,
    OpenWeatherService,
  ],
})
export class SharedModule {}
