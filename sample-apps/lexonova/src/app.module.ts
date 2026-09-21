import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { LegalModule } from './modules/legal/legal.module.js';

@McpApp({
    module: AppModule,
    server: {
        name: 'lexonova',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'lexonova',
    description: 'AI-powered legal rights assistant for Indian workers',
    imports: [
        ConfigModule.forRoot(),
        LegalModule,
    ],
})
export class AppModule { }