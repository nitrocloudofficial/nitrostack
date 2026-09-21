import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ProjectStateService } from './services/project-state.service.js';
import { IntakeModule } from './modules/intake/intake.module.js';
import { SdlcModule } from './modules/sdlc/sdlc.module.js';
import { RoadmapModule } from './modules/roadmap/roadmap.module.js';
import { AllocationModule } from './modules/allocation/allocation.module.js';
import { ReportingModule } from './modules/reporting/reporting.module.js';
import { TestModule } from "./modules/test/test.module.js";
@McpApp({
  module: AppModule,
  server: {
    name: 'projectpilot-ai',
    version: '1.0.0',
  },
  logging: {
    level: 'debug',
  },
})
@Module({
  name: 'app',
  description: 'ProjectManager AI Multi-Agent MCP Server Root Module',
  imports: [
  ConfigModule.forRoot(),

  TestModule,

  IntakeModule,
  SdlcModule,
  RoadmapModule,
  AllocationModule,
  ReportingModule,
],
  providers: [ProjectStateService],
  exports: [ProjectStateService],
})
export class AppModule {}