import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SurfaceModule } from './modules/surface/surface.module.js';

/**
 * Root Application Module — DomainExpansion.ai
 *
 * Reconstructs an enterprise's real API attack surface from access logs,
 * diffs it against a published OpenAPI contract to find shadow endpoints,
 * and reports authorization risk with citable log evidence.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'domainexpansion',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'domainexpansion',
    description: 'API attack-surface reconstruction and BOLA risk reporting from access logs',
    imports: [
        ConfigModule.forRoot(),
        SurfaceModule,
    ],
})
export class AppModule { }
