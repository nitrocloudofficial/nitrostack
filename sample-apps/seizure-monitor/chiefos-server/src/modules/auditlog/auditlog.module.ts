import { Module } from '@nitrostack/core';
import { AuditLogTools } from './auditlog.tools.js';
import { AuditLogResources } from './auditlog.resources.js';
import { AuditLogPrompts } from './auditlog.prompts.js';

@Module({
  name: 'auditlog',
  description: 'TODO: Add description',
  controllers: [AuditLogTools, AuditLogResources, AuditLogPrompts],
})
export class AuditLogModule {}
