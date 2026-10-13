import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { K8sModule } from './modules/k8s/k8s.module.js';

@McpApp({ module: AppModule, server: { name: 'helmsman', version: '1.0.0' }, logging: { level: 'info' } })
@Module({name:"app", imports: [ConfigModule.forRoot(), K8sModule] })
export class AppModule {}
