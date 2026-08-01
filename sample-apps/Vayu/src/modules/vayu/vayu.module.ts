import { Module } from '@nitrostack/core';
import { VayuTools } from './vayu.tools.js';
import { VayuResources } from './vayu.resources.js';

@Module({
  name: 'vayu',
  description: 'Personal real-time UV exposure guardian',
  controllers: [VayuTools, VayuResources] // Uses 'controllers', not 'providers'
})
export class VayuModule {}