import { Module } from '@nitrostack/core';
import { RequirementTools } from './requirement.tools.js';
import { RequirementResources } from './requirement.resources.js';
import { RequirementService } from './requirement.service.js';
import { CaseModule } from '../case/case.module.js';

/**
 * Requirement Module
 *
 * Third vertical slice. Responsibilities per this iteration's scope:
 * - Determine visa requirements (required documents, estimated timeline,
 *   application steps, special notes) from nationality, destinationCountry,
 *   and visaType, using a small hardcoded in-memory dataset
 *   (RequirementService). Supports at least India->Germany->Student,
 *   India->Germany->Work, India->USA->Student, India->Canada->Student.
 * - `resolve_requirements` tool: retrieves a case via VisaCaseService
 *   (imported from CaseModule via NitroStack DI, not HTTP, not
 *   tool-to-tool), resolves requirements for it, and returns a
 *   checklist/timeline/notes summary.
 * - `case://requirements/{caseId}` resource: read-only view of the latest
 *   cached summary for a case. In-memory caching only, no persistence, no
 *   events, no widgets.
 *
 * Explicitly out of scope for this slice: MongoDB, Qdrant, Firecrawl, RAG,
 * OCR, Broker, Approval, Notification, RabbitMQ, n8n, and any LLM
 * provider.
 *
 * TODO(requirement): the real analog in the target architecture is the
 * Policy Knowledge Module (docs/MODULES.md §3.5) — Qdrant-backed retrieval
 * over Firecrawl-ingested, reviewed, attributed sources, with freshness
 * and jurisdiction metadata (docs/RESOURCES.md `policy://jurisdiction/
 * {destination}`). This module's dataset is a hand-maintained placeholder
 * standing in for that, and must never be presented to end users as
 * verified guidance.
 * TODO(requirement): no audit, events, or approvals — resolving
 * requirements does not advance case state and must never be treated as
 * eligibility confirmation or a legal determination.
 */
@Module({
    name: 'requirement',
    description: 'Requirement Module (third vertical slice): deterministic visa requirement resolution from a hardcoded in-memory dataset, with in-memory per-case caching. No MongoDB, Qdrant, Firecrawl, RAG, OCR, or LLM calls.',
    imports: [CaseModule],
    controllers: [RequirementTools, RequirementResources],
    providers: [RequirementService]
})
export class RequirementModule { }
