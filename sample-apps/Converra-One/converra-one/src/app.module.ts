import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { PizzazModule } from './modules/pizzaz/pizzaz.module.js';

/**
 * Root Application Module
 * 
 * Pizza shop finder with interactive maps.
 * Showcases NitroStack Widget SDK features.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'pizzaz-finder',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'pizzaz',
    description: 'Pizza shop finder with interactive maps',
    imports: [
        ConfigModule.forRoot(),
        PizzazModule
    ],
})
export class AppModule { }
