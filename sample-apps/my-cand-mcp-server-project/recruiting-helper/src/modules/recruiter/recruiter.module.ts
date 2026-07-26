import { Module } from '@nitrostack/core';
import { RecruiterTools } from './recruiter.tools.js';
import { RecruiterResources } from './recruiter.resources.js';

@Module({
  name: 'recruiter',
  description: 'Autonomous Recruiting Helper module for candidate evaluation',
  controllers: [RecruiterTools, RecruiterResources]
})
export class RecruiterModule {}
