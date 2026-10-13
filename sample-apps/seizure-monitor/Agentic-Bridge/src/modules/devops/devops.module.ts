import { Module } from '@nitrostack/core';
import { DevOpsTools } from './devops.tools.js';
import { DevOpsService } from './devops.service.js';

@Module({
  name: 'devops',
  description: 'DevOps Navigator — CI/CD pipelines, branch model and commit contract',
  controllers: [DevOpsTools],
  providers: [DevOpsService],
  exports: [DevOpsService],
})
export class DevOpsModule {}
