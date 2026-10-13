import { Module } from '@nitrostack/core';
import { KubernetesService } from './kubernetes.service.js';
import { KubernetesTools } from './kubernetes.tools.js';
import { ConfigModule } from '../config/config.module.js';

@Module({
  name: 'kubernetesmodule',
  imports: [ConfigModule],
  controllers: [KubernetesTools],
  providers: [KubernetesService],
  exports: [KubernetesService],
})
export class KubernetesModule {}

