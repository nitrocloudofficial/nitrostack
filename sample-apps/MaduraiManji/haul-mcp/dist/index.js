var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import 'dotenv/config';
import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { TaskTools } from './modules/task/task.tools.js';
import { CalendarTools } from './modules/calendar/calendar.tools.js';
import { ProgressTools } from './modules/progress/progress.tools.js';
import { RiskTools } from './modules/risk/risk.tools.js';
import { HaulSystemPrompt } from './modules/prompts/haul.prompt.js';
import { TranscriptTools } from './modules/transcript/transcript.tools.js';
let HaulModule = class HaulModule {
};
HaulModule = __decorate([
    Module({
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
], HaulModule);
export { HaulModule };
let AppModule = class AppModule {
};
AppModule = __decorate([
    McpApp({
        module: AppModule,
        server: {
            name: 'haul-mcp-server',
            version: '1.0.0'
        }
    }),
    Module({
        name: 'app',
        imports: [ConfigModule.forRoot(), HaulModule],
        providers: [
            { provide: 'OAUTH_CONFIG', useValue: {} }
        ]
    })
], AppModule);
export { AppModule };
import { McpApplicationFactory } from '@nitrostack/core';
async function bootstrap() {
    const server = await McpApplicationFactory.create(AppModule);
    await server.start();
}
bootstrap().catch(console.error);
