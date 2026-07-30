import 'dotenv/config';
import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { TaskTools } from './modules/task/task.tools.js';
import { CalendarTools } from './modules/calendar/calendar.tools.js';
import { ProgressTools } from './modules/progress/progress.tools.js';
import { RiskTools } from './modules/risk/risk.tools.js';
import { HaulSystemPrompt } from './modules/prompts/haul.prompt.js';
import { TranscriptTools } from './modules/transcript/transcript.tools.js';

@Module({
  name: 'haul',
  description: 'Meeting 2 Mission — AI-powered meeting assistant that creates tasks, schedules calendar events, analyzes risks, and tracks team progress.',
  controllers: [
    TaskTools,
    CalendarTools,
    ProgressTools,
    RiskTools,
    HaulSystemPrompt,
    TranscriptTools,
  ]
})
export class HaulModule {}

@McpApp({
  module: AppModule,
  server: {
    name: 'haul-mcp-server',
    version: '1.0.0'
  }
})
@Module({
  name: 'app',
  imports: [ConfigModule.forRoot(), HaulModule],
  providers: [
    { provide: 'OAUTH_CONFIG', useValue: {} }
  ]
})
export class AppModule {}

import { McpApplicationFactory } from '@nitrostack/core';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch(console.error);
