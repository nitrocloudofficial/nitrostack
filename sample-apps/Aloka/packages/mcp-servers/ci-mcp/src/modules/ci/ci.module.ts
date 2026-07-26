import { Module } from '@nitrostack/core';
import { CITools } from './ci.tools.js';
import { CIResources } from './ci.resources.js';
import { CIService } from './ci.service.js';

@Module({
  name: 'ci',
  description: 'Continuous Integration MCP server',
  controllers: [CITools, CIResources],
  providers: [CIService]
})
export class CIModule {}
