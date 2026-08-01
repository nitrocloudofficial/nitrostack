import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { RakshaNetModule } from './modules/rakshanet/rakshanet.module.js';

/**
 * Root Application Module
 * 
 * RakshaNet - Autonomous AI-powered women's safety system
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'rakshanet',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'rakshanet',
    description: 'RakshaNet threat assessment and safety assistant',
    imports: [
        ConfigModule.forRoot(),
        RakshaNetModule
    ],
})
export class AppModule { }
