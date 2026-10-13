import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { MemoraModule } from './modules/memora/memora.module.js';

@McpApp({
    module: AppModule,
    server: {
        name: 'memora-server',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'app',
    description: 'Root module for Memora Autonomous Study Platform',
    imports: [
        ConfigModule.forRoot(),
        MemoraModule
    ],
})
export class AppModule { }
