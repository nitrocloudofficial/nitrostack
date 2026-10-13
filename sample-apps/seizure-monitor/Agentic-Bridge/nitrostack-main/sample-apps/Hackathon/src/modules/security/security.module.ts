import { Module } from '@nitrostack/core';
import { SecurityTools } from './security.tools.js';
import { SecurityPrompts } from './security.prompts.js';

@Module({
  name: 'security',
  description: 'Cybersecurity tools and prompts for the Security Analyst',
  controllers: [SecurityTools, SecurityPrompts]
})
export class SecurityModule {}
