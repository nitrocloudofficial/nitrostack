import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { KnowledgeModule } from './modules/knowledge/knowledge.module.js';

/**
 * Root Application Module
 * 
 * Codebase Knowledge and GitHub integration server.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'codebase-knowledge-mcp',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'root',
    description: 'Codebase Knowledge and GitHub integration services',
    imports: [
        ConfigModule.forRoot(),
        KnowledgeModule
    ],
})
export class AppModule { }
