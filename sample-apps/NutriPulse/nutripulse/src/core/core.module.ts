import { Module } from '@nitrostack/core';
import { ResourceNotifierService } from './resource-notifier.service.js';

@Module({
  name: 'CoreModule',
  description: 'Core shared services',
  providers: [ResourceNotifierService],
  exports: [ResourceNotifierService],
})
export class CoreModule {}
