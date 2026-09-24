import { Module } from '@nitrostack/core';
import { AccessTools } from './access.tools.js';
import { TicketTools } from './ticket.tools.js';
import { AccessResources } from './access.resources.js';
import { AccessPrompts } from './access.prompts.js';

@Module({
  name: 'access',
  description: 'IT access resolver — identity, group, license, network diagnostics and remediation',
  controllers: [AccessTools, TicketTools, AccessResources, AccessPrompts],
})
export class AccessModule {}

