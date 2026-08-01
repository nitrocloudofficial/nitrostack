/**
 * SentryFlowModule
 * 
 * Amazon return fraud detection module.
 * Registers all services, guards, and tools for the SentryFlow MCP server.
 */

import { Module } from '@nitrostack/core';
import { MockAmazonService } from './services/mock-amazon.service.js';
import { FraudScoringService } from './services/fraud-scoring.service.js';
import { AuditLogService } from './services/audit-log.service.js';
import { EmailService } from './services/email.service.js';
import { ClaimReviewGuard } from './guards/claim-review.guard.js';
import { DisputeTools } from './tools/dispute.tools.js';

@Module({
  name: 'sentryflow',
  description: 'Amazon return fraud detection with human-in-the-loop guardrails',
  controllers: [DisputeTools],
  providers: [MockAmazonService, FraudScoringService, AuditLogService, EmailService, ClaimReviewGuard],
})
export class SentryFlowModule {}
