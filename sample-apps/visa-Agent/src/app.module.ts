import { McpApp, Module, ConfigModule, OAuthModule } from '@nitrostack/core';
import { CaseModule } from './modules/case/case.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { RequirementModule } from './modules/requirement/requirement.module.js';
import { DocumentModule } from './modules/document/document.module.js';
import { HousingModule } from './modules/housing/housing.module.js';
import { BrokerRecommendationModule } from './modules/recommendation/recommendation.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { OnboardingWorkflowGuard } from './services/onboarding-workflow.guard.js';

/**
 * [HLD] Planned Knowledge and Action workflows
 * [STATUS: CONCEPTUAL — no tools are registered for these workflows yet]
 * ------------------------------------------------------------------
 * RAG chatbot: translate/STT when needed; retrieve only Qdrant policy chunks
 * filtered by `{country, visaType}`; compose from those sources only; return
 * a clarification or "not in the official source" on low retrieval rather
 * than hallucinating. Cache hot answers by `rag:{country}:{visaType}:hash`.
 *
 * Human approval: the agent prepares extraction, validation, rankings, and a
 * packet; an ops human reviews and commits document acceptance, broker
 * assignment, or final submission. Audit writes are append-only and must
 * succeed before a gated commit. A partial application is a hard submission
 * block. This is deliberately represented by omission today: no such tool is
 * registered below.
 *
 * Intended gated operations: `mark_document_accepted` accepts only a pending
 * document and records an override reason for a needs-fix/expiry-risk item;
 * `assign_broker` re-checks capacity at commit time; `submit_application`
 * requires every checklist item to be accepted plus explicit confirmation.
 * `writeAudit` appends `{ action, actorId, actorRole, caseId, target, reason?,
 * ts }` before each irreversible mutation and never updates or deletes it.
 *
 * Notifications: meaningful state changes emit events to n8n. n8n performs
 * retryable email/message/scheduling side effects outside the request path;
 * exhausted retries reach an ops dead-letter queue. A scheduled expiry-risk
 * check proactively alerts before a document becomes a submission blocker.
 * `document.flagged` carries the fix reason; `broker.assigned` and
 * `application.submitted` carry the client/ops notification payload.
 * [/HLD]
 */
/**
 * Root Application Module
 *
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 *
 * OAuth 2.1 Authentication:
 * - Configured with Auth0 as the authorization server
 * - Supports read, write, and admin scopes
 * - Validates tokens with audience binding (RFC 8707)
 *
 * Visa Agent:
 * - CaseModule: first real vertical slice of the Visa Case Module
 *   (docs/MODULES.md §3.1) — case_start and case_get, in-memory only.
 *   TODO(visa-case): see case.service.ts and case.tools.ts for the list of
 *   still-missing capabilities (persistence, audit, events, approvals).
 * - OnboardingModule: second vertical slice — deterministic (no LLM),
 *   regex/heuristic extraction of nationality, destinationCountry, and
 *   visaType from a free-form message, then case_start via VisaCaseService
 *   (injected from CaseModule, not called over HTTP or tool-to-tool).
 *   TODO(onboarding): see onboarding.module.ts for scope and future
 *   LLM-integration TODOs.
 * - RequirementModule: third vertical slice — deterministic visa
 *   requirement resolution (documents/timeline/steps/notes) from a small
 *   hardcoded in-memory dataset, keyed on a case's nationality,
 *   destinationCountry, and visaType. Retrieves the case via
 *   VisaCaseService (injected from CaseModule) and caches the result
 *   in-memory for `case://requirements/{caseId}` to read back.
 *   TODO(requirement): see requirement.module.ts for scope and the future
 *   Policy Knowledge Module TODOs.
 * - DocumentModule: fourth vertical slice — in-memory document upload, a
 *   deterministic OCR stub (no vendor, no LLM), and deterministic
 *   validation of extracted fields against a case. Retrieves the case via
 *   VisaCaseService (injected from CaseModule), the same DI pattern the
 *   Onboarding and Requirement modules use.
 *   TODO(document): see document.module.ts for scope and the future
 *   Documents Module TODOs.
 * - HousingModule: fifth vertical slice, and the first module backed by
 *   MongoDB Atlas rather than process memory — housing preference capture
 *   and deterministic broker shortlisting (no LLM, no ranking, no
 *   assignment). Retrieves the case via VisaCaseService (injected from
 *   CaseModule), the same DI pattern the other slices use.
 *   TODO(housing): see housing.module.ts for scope and the future Broker
 *   Module TODOs.
 * - BrokerRecommendationModule: sixth vertical slice — the AI ranking layer
 *   over the Housing Module's deterministic shortlist, using Gemini 2.5
 *   Flash. It orders a fixed candidate set and validates every returned
 *   brokerId against it; it never filters, widens, selects, or assigns.
 *   TODO(recommendation): see recommendation.module.ts for scope and the
 *   Approval Module TODOs.
 * See docs/ARCHITECTURE.md and docs/MODULES.md for the full target Visa
 * Agent module set (Case, Client, Operations, Documents, Policy Knowledge,
 * Broker, Task, Approval, Notification, Audit).
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'visa-agent-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Visa Agent MCP server with OAuth 2.1 authentication',
  imports: [
    ConfigModule.forRoot(),

    // Enable OAuth 2.1 authentication
    OAuthModule.forRoot({
      // Whether OAuth is enforced. Defaults to false (dev-friendly): the server
      // runs out-of-the-box and protected endpoints are reachable without a token.
      // Set OAUTH_REQUIRED=true to enforce auth (fail-closed). When enforced but no
      // verifier (JWKS_URI / INTROSPECTION_ENDPOINT) is configured, the server still
      // starts and warns, but rejects protected requests until one is configured.
      required: process.env.OAUTH_REQUIRED === 'true',

      // Resource URI - YOUR MCP server's public URL
      // This is used for token audience binding (RFC 8707)
      // CRITICAL: Tokens must be issued specifically for this URI
      resourceUri: process.env.RESOURCE_URI || 'https://mcplocal',

      // Authorization Server(s) - The OAuth provider URL(s)
      // Supports multiple auth servers for federation scenarios
      authorizationServers: [
        process.env.AUTH_SERVER_URL || 'https://dev-5dt0utuk31h13tjm.us.auth0.com',
      ],

      // Supported scopes for this MCP server
      // Define what permissions your server supports
      scopesSupported: [
        'read',        // Read access to resources
        'write',       // Write/modify resources
        'admin',       // Administrative operations
      ],

      // Token Introspection (RFC 7662) - For opaque tokens
      // If your OAuth provider issues opaque tokens (not JWTs),
      // you MUST configure introspection to validate them
      tokenIntrospectionEndpoint: process.env.INTROSPECTION_ENDPOINT,
      tokenIntrospectionClientId: process.env.INTROSPECTION_CLIENT_ID,
      tokenIntrospectionClientSecret: process.env.INTROSPECTION_CLIENT_SECRET,

      // Expected audience (defaults to resourceUri if not provided)
      // MUST match the audience claim in tokens (RFC 8707)
      audience: process.env.TOKEN_AUDIENCE,

      // Expected issuer (optional but recommended)
      // If provided, tokens must be from this issuer
      issuer: process.env.TOKEN_ISSUER,

      // Custom validation (optional)
      // Add any additional validation logic beyond spec requirements
      customValidation: async (tokenPayload) => {
        // Example: Check if user is active in your database
        // const user = await db.users.findOne({ id: tokenPayload.sub });
        // return user?.active === true;

        // For now, accept all valid tokens
        return true;
      },
    }),

    CaseModule,
    OnboardingModule,
    RequirementModule,
    DocumentModule,
    HousingModule,
    BrokerRecommendationModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
    OnboardingWorkflowGuard,
  ]
})
export class AppModule { }
