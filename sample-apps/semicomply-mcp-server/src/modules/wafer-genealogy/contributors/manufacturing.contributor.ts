import { Injectable } from '@nitrostack/core';
import { GenealogyContributor, GenealogyEvent } from '../genealogy-types.js';
import { ManufacturingMESService } from '../../manufacturing/manufacturing.service.js';

@Injectable({ deps: [ManufacturingMESService] })
export class ManufacturingContributor implements GenealogyContributor {
    readonly sourceName = 'MES Telemetry';

    constructor(private readonly mesService: ManufacturingMESService) {}

    async fetchEvents(batchId: string): Promise<GenealogyEvent[]> {
        const telemetry = await this.mesService.getTelemetry(batchId);
        if (!telemetry) return [];

        return [
            {
                timestamp: new Date().toISOString(),
                source: this.sourceName,
                processStep: `Manufacturing — ${telemetry.recipeName}`,
                details: {
                    stationId: telemetry.stationId,
                    recipeName: telemetry.recipeName,
                    chamberPressure: telemetry.chamberPressure,
                    temperature: telemetry.temperature,
                    operatorId: telemetry.operatorId,
                },
            },
        ];
    }
}
