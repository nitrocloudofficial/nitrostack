import { Module } from '@nitrostack/core';
import { TeamBuilderController } from './team-builder.controller.js';
import { TeamBuilderService } from './team-builder.service.js';

@Module({
  name: 'team-builder',
  description: 'AI Hackathon Team Builder MCP Module',
  providers: [TeamBuilderService],
  controllers: [TeamBuilderController],
  exports: [TeamBuilderService]
})
export class TeamBuilderModule {}
