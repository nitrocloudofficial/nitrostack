import { Module } from '@nitrostack/core';
import { CloudResources, CloudTools } from './cloud.tools.js';

@Module({
  name: 'cloud',
  description: 'Read-only AWS inventory: end-of-life and risky resources as ranked findings',
  controllers: [CloudTools, CloudResources]
})
export class CloudModule {}
