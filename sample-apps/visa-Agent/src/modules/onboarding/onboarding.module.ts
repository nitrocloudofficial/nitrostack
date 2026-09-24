import { Module } from '@nitrostack/core';
import { OnboardingTools } from './onboarding.tools.js';
import { OnboardingPrompts } from './onboarding.prompts.js';
import { OnboardingService } from './onboarding.service.js';
import { OnboardingExtractionService } from './onboarding-extraction.service.js';
import { CaseModule } from '../case/case.module.js';

/**
 * Onboarding Module
 *
 * Second vertical slice. Responsibilities per this iteration's scope:
 * - Accept a free-form onboarding message.
 * - Deterministically extract nationality, destinationCountry, and
 *   visaType using regex/heuristics only (OnboardingExtractionService).
 * - When all three are present, start a visa case by calling
 *   VisaCaseService directly (imported from CaseModule via NitroStack DI),
 *   not over HTTP and not via a tool-to-tool call.
 * - When any field is missing, return a structured list of what's missing.
 *
 * Explicitly out of scope for this slice (per current task instructions):
 * any LLM provider (Gemini, OpenAI, Claude, DeepSeek), OCR, MongoDB,
 * Notifications, Approval, Broker, Qdrant, RAG, Firecrawl, RabbitMQ, n8n.
 *
 * TODO(onboarding): future LLM integration should replace or augment
 * OnboardingExtractionService behind the same OnboardingExtractionResult
 * contract (see onboarding-extraction.service.ts), not change this module's
 * public tool/prompt surface.
 * TODO(onboarding): this module has no persistence, audit, or event
 * emission of its own — it only calls VisaCaseService, which has the same
 * gaps (see src/modules/case/case.service.ts TODOs).
 */
@Module({
    name: 'onboarding',
    description: 'Onboarding Module (second vertical slice): deterministic natural-language extraction of nationality, destinationCountry, and visaType, then case_start via VisaCaseService. No LLM calls.',
    imports: [CaseModule],
    controllers: [OnboardingTools, OnboardingPrompts],
    providers: [OnboardingExtractionService, OnboardingService]
})
export class OnboardingModule { }
