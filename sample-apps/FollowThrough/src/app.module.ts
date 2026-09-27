import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { IngestionModule } from './modules/ingestion/ingestion.module.js';
import { StoreModule } from './modules/store/store.module.js';
import { EvidenceModule } from './modules/evidence/evidence.module.js';
import { NudgeModule } from './modules/nudge/nudge.module.js';
import { LinearModule } from './modules/linear/linear.module.js';
import { SchedulerModule } from './modules/scheduler/scheduler.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'follow-through',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Follow-Through \u2014 the agent that remembers what everyone promised, so nothing quietly dies.',
  imports: [
    ConfigModule.forRoot(),
    IngestionModule,
    StoreModule,
    EvidenceModule,
    NudgeModule,
    LinearModule,
    SchedulerModule
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}
