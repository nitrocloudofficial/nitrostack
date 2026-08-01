import { Module } from '@nitrostack/core';
import { DatabaseModule }    from '../database/database.module.js';
import { AuditService }      from './audit.service.js';
import { ScopeGuardService } from './scope-guard.service.js';
import { SessionService }    from './session.service.js';
import { NliService }        from './nli.service.js';
import { VirusTotalService } from './virustotal.service.js';
import { AuditTools }        from './audit.tools.js';

/**
 * AuditModule — Person B
 *
 * Provides:
 *   AuditService      — SHA-256 tamper-evident hash-chain log (MongoDB-backed)
 *   ScopeGuardService — NLI scope authorization (OpenAI/Anthropic/mock)
 *   SessionService    — JSONL-backed red-team session store
 *
 * Exposes MCP tools:
 *   verify_audit_chain  — walk hash chain, report tamper status
 *   log_audit_entry     — append a finding to the audit chain
 *   check_scope         — NLI authorization check for a proposed tool call
 *   create_session      — start a new red-team session with a declared scope
 *   get_session         — retrieve a session by sessionId
 */
@Module({
  name: 'audit',
  description: 'Tamper-evident audit chain, NLI scope guard, and session store (Person B)',
  imports:     [DatabaseModule],
  providers:   [AuditService, ScopeGuardService, SessionService, NliService, VirusTotalService],
  controllers: [AuditTools],
  exports:     [AuditService, ScopeGuardService, SessionService, NliService, VirusTotalService],
})
export class AuditModule {}
