import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { WardCopilotModule } from './modules/ward-copilot/ward-copilot.module.js';

/**
 * Root Application Module
 * 
 * Ward Copilot Production Healthcare MCP Server.
 * Wraps FastAPI Backend for Agentic AI Deterioration Explainer.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'ward-copilot-mcp',
        version: '2.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'ward-copilot',
    description: 'Ward Copilot Healthcare MCP Server',
    imports: [
        ConfigModule.forRoot(),
        WardCopilotModule
    ],
})
export class AppModule { }
