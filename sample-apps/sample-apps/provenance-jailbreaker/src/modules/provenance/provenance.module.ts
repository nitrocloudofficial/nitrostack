import { Module } from '@nitrostack/core';
import { AuditModule } from '../audit/audit.module.js';
import { ProvenanceTools } from './provenance.tools.js';

/**
 * ProvenanceModule — Person B's core MCP tools
 *
 * Imports AuditModule to get access to:
 * - SessionService
 * - NliService
 * - AuditService
 * - VirusTotalService
 *
 * Exposes MCP tools:
 * - anchor_intent
 * - check_params
 * - query_audit
 */
@Module({
  name: 'provenance',
  description: 'Provenance guard and tool interception (Person B)',
  imports: [AuditModule],
  controllers: [ProvenanceTools],
})
export class ProvenanceModule {}
