import { Module, McpApp } from '@nitrostack/core';
import { ContextService } from './modules/context/context.service.js';
import { PolicyService } from './modules/policy/policy.service.js';
import { ListingService } from './modules/listing/listing.service.js';
import { ConversationService } from './modules/conversation/conversation.service.js';
import { PaymentService } from './modules/payment/payment.service.js';
import { IdentityService } from './modules/identity/identity.service.js';
import { RecoveryService } from './modules/recovery/recovery.service.js';
import { RiskEvaluatorService } from './modules/friction/friction.service.js';
import { PromptInjectionGuard } from './guards/prompt-injection.guard.js';
import { RedactionGuard } from './guards/redaction.guard.js';

/**
 * Root Application Module for TrustLayer AI
 * 
 * controllers: classes that expose @Tool / @Resource / @Prompt endpoints
 * providers:   pure DI services / guards with no tool decorators
 */
@McpApp({
  module: TrustLayerModule,
  server: {
    name: 'trustlayer-ai',
    version: '4.0.0'
  },
  transport: {
    type: 'dual',
    http: {
      port: 3000,
      host: '0.0.0.0'
    }
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'trustlayer-ai-root',
  description: 'Privacy-preserving transaction safety infrastructure for P2P commerce',
  controllers: [
    ContextService,
    PolicyService,
    ListingService,
    ConversationService,
    PaymentService,
    IdentityService,
    RecoveryService,
    RiskEvaluatorService,
  ],
  providers: [
    ContextService,
    PolicyService,
    ListingService,
    ConversationService,
    PaymentService,
    IdentityService,
    RecoveryService,
    RiskEvaluatorService,
    PromptInjectionGuard,
    RedactionGuard,
  ]
})
export class TrustLayerModule {}
