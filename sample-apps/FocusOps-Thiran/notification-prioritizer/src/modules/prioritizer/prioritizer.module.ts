import { Module } from '@nitrostack/core';
import { PrioritizerTools } from './prioritizer.tools.js';

@Module({
  name: 'prioritizer',
  description: 'Notification prioritization engine and widget handler',
  controllers: [PrioritizerTools]
})
export class PrioritizerModule {}
