import { Module } from '@nitrostack/core';
import { SkillsTools } from './skills.tools.js';
import { SkillRuntimeService } from './skill-runtime.service.js';

@Module({
  name: 'skills',
  description: 'Dynamic skill generation — the swarm mints and registers its own MCP tools',
  controllers: [SkillsTools],
  providers: [SkillRuntimeService],
  exports: [SkillRuntimeService],
})
export class SkillsModule {}
