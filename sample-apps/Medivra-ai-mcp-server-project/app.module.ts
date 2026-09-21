import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { MedivraModule } from './modules/medivra/medivra.module.js';

/**
 * Root Application Module
 *
 * Medivra AI — agentic healthcare platform.
 * Exposes prescription OCR/parsing, blood report analysis, and a
 * grounded health Q&A assistant as real MCP tools.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'medivra-ai',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'medivra-ai',
    description: 'Medivra AI agentic healthcare assistant',
    imports: [
        ConfigModule.forRoot(),
        MedivraModule
    ],
})
export class AppModule { }
