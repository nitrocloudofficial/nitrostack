import { Module } from '@nitrostack/core';
import { AuditTools } from './audit.tools.js';
import { AuditPrompts } from './audit.prompts.js';

@Module({
  name: 'audit',
  description: 'AuditPulse Advanced Agents',
  controllers: [AuditTools, AuditPrompts]
})
export class AuditModule {}
