import { McpApp, Module, OAuthModule } from '@nitrostack/core';

// Tool Modules
import { PatientTools } from './modules/patient.tools.js';
import { ResearchTools } from './modules/research.tools.js';
import { EligibilityTools } from './modules/eligibility.tools.js';
import { AttendanceTools } from './modules/attendance.tools.js';
import { RankingTools } from './modules/ranking.tools.js';
import { JourneyTools } from './modules/journey.tools.js';
import { SchedulerTools } from './modules/scheduler.tools.js';
import { CopilotTools } from './modules/copilot.tools.js';
import { SideEffectsTools } from './modules/side-effects.tools.js';
import { ReportsTools } from './modules/reports.tools.js';

@Module({
  name: 'AppModule',
  imports: [
    OAuthModule.forRoot({
      resourceUri: 'http://localhost:3000',
      authorizationServers: ['http://localhost:3000'],
      required: false,
    }),
  ],
  controllers: [
    PatientTools,
    ResearchTools,
    EligibilityTools,
    AttendanceTools,
    RankingTools,
    JourneyTools,
    SchedulerTools,
    CopilotTools,
    SideEffectsTools,
    ReportsTools,
  ],
})
export class AppModule {}

@McpApp({
  module: AppModule,
  server: {
    name: 'trialsync-ai',
    version: '1.0.0',
  },
})
export class RootApp {}