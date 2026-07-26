import { Module } from '@nitrostack/core';
import { AuditService } from './audit.service.js';
import { AuditResources } from './audit.resources.js';

/**
 * AuditModule — compliance audit engine.
 *
 * Providers:
 *   - AuditService: singleton @OnEvent listener that records every ticket lifecycle event.
 *   - AuditResources: exposes audit://history and audit://recent MCP resources.
 */
@Module({
  name: 'audit',
  description: 'SOC-2 style compliance audit log — tracks all automated IT access operations',
  providers: [AuditService],
  controllers: [AuditResources],
})
export class AuditModule {}
