import { Module } from '@nitrostack/core';
import { PathPilotTools } from './pathpilot.tools.js';
import { PathPilotResources } from './pathpilot.resources.js';
import { PathPilotPrompts } from './pathpilot.prompts.js';

@Module({
  name: 'pathpilot',
  description: 'PathPilot GitHub + LinkedIn Skill Evidence MCP Server — orchestration and evidence-fusion layer for adaptive career roadmaps.',
  controllers: [PathPilotTools, PathPilotResources, PathPilotPrompts],
})
export class PathPilotModule {}
