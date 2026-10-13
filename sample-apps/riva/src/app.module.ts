import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { RidesModule } from './modules/rides/rides.module.js';
import { DriverModule } from './modules/driver/driver.module.js';
import { SessionModule } from './modules/session/session.module.js';
import { JourneyModule } from './modules/journey/journey.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module — RIVA (Ride Intelligence & Virtual Assistance)
 *
 * Phase 1 (Customer MVP): RidesModule — ride discovery, comparison,
 * recommendation, preferences, nearby-driver visualization, return-fare
 * forecasting.
 *
 * Phase 2 (Driver Intelligence): DriverModule — trip-acceptance analysis,
 * destination demand, next-zone suggestions, earnings summaries, nearby
 * ride marketplace. SessionModule — the rider/driver mode switch shared
 * across both, including a `start_conversation` prompt and a
 * `set_user_mode` tool that should be used at the start of every new
 * conversation to ask the user whether they need the rider or driver
 * assistant.
 *
 * Phase 3 (Intelligent Mobility Copilot): JourneyModule — travel
 * concierge, ride-later forecasting, multi-stop planning, pooling
 * simulation, SOS safety simulation, and booking lifecycle simulation.
 *
 * Per the reliability rules, ConfigModule.forRoot() only reads environment
 * variables here — it never calls Geoapify or Apify at startup. Those
 * integrations are lazily initialized inside their respective
 * services/providers on first tool invocation.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'riva',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [ConfigModule.forRoot(), RidesModule, DriverModule, SessionModule, JourneyModule],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ],
})
export class AppModule {}
