import { Module } from '@nitrostack/core';
import { AnalyticsModule }    from '../analytics/analytics.module.js';
import { AlertService }        from './alert.service.js';
import { AlertWorker }         from './alert-worker.service.js';
import { InboxService }        from './inbox.service.js';
import { CommunicationTools }  from './communication.tools.js';

/**
 * CommunicationModule — queue-backed email alerting, inbox ingestion,
 * SLA escalation, and daily digest for the ALE SCM MCP server.
 *
 * Boot order:
 *  1. AnalyticsModule  → DatabaseService + AuditLogService (shared DB + WAL mode)
 *  2. AlertService     → SMTP transporter init (dry-run if SMTP vars absent)
 *  3. AlertWorker      → starts flush interval (OnApplicationBootstrap)
 *  4. InboxService     → IMAP config read (no connection until pollInbox() is called)
 *  5. CommunicationTools → MCP tool endpoints
 *
 * Exports AlertService so OrchestratorModule can inject it into route_task.
 */
@Module({
  name: 'communication',
  imports: [AnalyticsModule], // provides DatabaseService and AuditLogService
  providers: [
    AlertService,
    AlertWorker,
    InboxService,
  ],
  controllers: [CommunicationTools], // MCP tool endpoints
  exports: [
    AlertService,   // consumed by OrchestratorModule (route_task upgrade)
    InboxService,
  ],
})
export class CommunicationModule {}
