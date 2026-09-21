import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { VerichainModule } from './modules/verichain/verichain.module.js';

/**
 * Root Application Module
 * 
 * VeriChain AI Evidence Intelligence Platform MCP Server.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'VeriChain AI Server',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'verichain-root',
    description: 'VeriChain AI root application module',
    imports: [
        ConfigModule.forRoot(),
        VerichainModule
    ],
})
export class AppModule { }
