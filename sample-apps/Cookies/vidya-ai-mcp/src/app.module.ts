import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { ResearchModule } from './modules/research/research.module.js';
import { QuizModule } from './modules/quiz/quiz.module.js';
import { LectureModule } from './modules/lecture/lecture.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { ReportModule } from './modules/report/report.module.js';
import { ViCoinsModule } from './modules/vicoins/vicoins.module.js';
import { PlannerModule } from './modules/planner/planner.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'vidyaai-mcp',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    CalculatorModule,
    ResearchModule,
    QuizModule,
    LectureModule,
    ChatModule,
    ReportModule,
    ViCoinsModule,
    PlannerModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

