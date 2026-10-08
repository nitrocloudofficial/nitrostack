import { Injectable } from '@nitrostack/core';
import { OnboardingExtractionService, OnboardingExtractionResult } from './onboarding-extraction.service.js';
import { VisaCaseService } from '../case/case.service.js';

export type MissingOnboardingField = 'nationality' | 'destinationCountry' | 'visaType';

export interface OnboardingCaseStartedResult {
    outcome: 'case_started';
    extracted: {
        nationality: string;
        destinationCountry: string;
        visaType: string;
    };
    caseId: string;
    status: string;
    createdAt: string;
    nextStep: string;
}

export interface OnboardingMissingInformationResult {
    outcome: 'missing_information';
    extracted: OnboardingExtractionResult;
    missingFields: MissingOnboardingField[];
}

export type OnboardingResult = OnboardingCaseStartedResult | OnboardingMissingInformationResult;

/**
 * OnboardingService
 *
 * Second vertical slice: orchestrates deterministic extraction
 * (OnboardingExtractionService) and, once nationality, destinationCountry,
 * and visaType are all known, starts a visa case by calling
 * VisaCaseService.createCase() directly — the same in-memory service the
 * `case_start` tool (docs/TOOLS.md §4.1, src/modules/case/case.tools.ts)
 * uses. No HTTP call and no tool-to-tool call are involved; this is a
 * plain NitroStack dependency injection call into a service exported by
 * the Visa Case Module (see the `exports` note in case.module.ts).
 *
 * TODO(onboarding): once the Visa Case Module gains consent capture, audit
 * logging, and the `case.created` event (docs/EVENTS.md), onboarding-started
 * cases must go through the same governance path — this slice does not add
 * any of that itself.
 * TODO(onboarding): future LLM-backed extraction should implement the same
 * OnboardingExtractionResult contract so this orchestration logic does not
 * need to change; see onboarding-extraction.service.ts and
 * onboarding.module.ts for where that would plug in.
 */
@Injectable({ deps: [OnboardingExtractionService, VisaCaseService] })
export class OnboardingService {
    constructor(
        private extractionService: OnboardingExtractionService,
        private visaCaseService: VisaCaseService
    ) { }

    /**
     * [LLD] Conversational onboarding orchestration
     * - Extract structured facts, identify missing required fields, and ask
     *   only for those fields; do not advance an incomplete case.
     * - Once complete, create the case and hand it to requirement resolution.
     * - The planned production flow also persists incremental profile fields,
     *   emits `case.created`, and supports voice/translation adapters.
     */
    async processMessage(message: string): Promise<OnboardingResult> {
        const extracted = this.extractionService.extract(message);

        const missingFields: MissingOnboardingField[] = [];
        if (!extracted.nationality) missingFields.push('nationality');
        if (!extracted.destinationCountry) missingFields.push('destinationCountry');
        if (!extracted.visaType) missingFields.push('visaType');

        if (missingFields.length > 0) {
            return {
                outcome: 'missing_information',
                extracted,
                missingFields
            };
        }

        // TypeScript can't see that missingFields.length === 0 implies these
        // are non-null, so the fields are asserted explicitly here.
        const nationality = extracted.nationality as string;
        const destinationCountry = extracted.destinationCountry as string;
        const visaType = extracted.visaType as string;

        const record = await this.visaCaseService.createCase({
            nationality,
            destinationCountry,
            visaType
        });

        return {
            outcome: 'case_started',
            extracted: { nationality, destinationCountry, visaType },
            caseId: record.caseId,
            status: record.status,
            createdAt: record.createdAt,
            nextStep: record.nextStep
        };
    }
}
