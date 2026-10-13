import { Injectable } from '@nitrostack/core';
import { GenealogyContributor, GenealogyEvent } from '../genealogy-types.js';
import { QualityTestService } from '../../quality/quality.service.js';

@Injectable({ deps: [QualityTestService] })
export class QualityContributor implements GenealogyContributor {
    readonly sourceName = 'Quality & Test';

    constructor(private readonly qualityService: QualityTestService) {}

    async fetchEvents(batchId: string): Promise<GenealogyEvent[]> {
        const summary = await this.qualityService.getYieldSummary(batchId);
        if (!summary) return [];

        return [
            {
                timestamp: new Date().toISOString(),
                source: this.sourceName,
                processStep: 'Quality Testing — STDF Yield Analysis',
                details: {
                    totalWafersTested: summary.totalWafersTested,
                    overallYield: summary.overallYield,
                    failingBins: summary.failingBins,
                },
            },
        ];
    }
}
