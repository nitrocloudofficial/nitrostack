import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ResearchModule } from './modules/research.module.js';

/**
 * Root Application Module
 * 
 * AI-Powered Competitive Research Assistant MCP Server.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'competitive-research-assistant',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'research-assistant',
    description: 'AI-Powered Competitive Research Assistant',
    imports: [
        ConfigModule.forRoot(),
        ResearchModule
    ],
})
export class AppModule { }
