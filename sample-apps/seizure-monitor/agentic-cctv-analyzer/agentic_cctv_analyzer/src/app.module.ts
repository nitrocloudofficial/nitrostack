import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CctvModule } from './modules/cctv/cctv.module.js';

/**
 * Root Application Module
 * 
 * CCTV analyzer with interactive event widgets.
 * Showcases NitroStack Widget SDK features.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'cctv-analyzer',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'cctv-analyzer',
    description: 'CCTV analyzer with interactive event widgets',
    imports: [
        ConfigModule.forRoot(),
        CctvModule,
    ],
})
export class AppModule { }
