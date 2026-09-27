import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { IndustryModule } from './modules/industry/industry.module.js';

/**
 * Root Application Module
 * Industry 4.0 Multi-Agent MCP System
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'industry4-mcp',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})

@Module({
    name: 'app',
    description: 'Industry 4.0 Plant Orchestrator Multi-Agent System',
    imports: [
        ConfigModule.forRoot(),
        IndustryModule // Sirf aapka apna module rahega
    ],
})
export class AppModule { }