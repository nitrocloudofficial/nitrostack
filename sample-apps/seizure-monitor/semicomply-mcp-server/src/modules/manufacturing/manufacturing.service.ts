import { Injectable } from '@nitrostack/core';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service.js';

export interface ManufacturingTelemetry {
    lotId: string;
    stationId: string;
    recipeName: string;
    chamberPressure: string;
    temperature: string;
    operatorId: string;
}

@Injectable({ deps: [GoogleSheetsService] })
export class ManufacturingMESService {
    constructor(private readonly sheets: GoogleSheetsService) {}

    async getTelemetry(lotId: string): Promise<ManufacturingTelemetry | undefined> {
        const map = await this.sheets.fetchSheetAsMap('MES Telemetry', 'lotId');
        const row = map[lotId];
        if (!row) return undefined;
        return {
            lotId: row.lotId,
            stationId: row.stationId,
            recipeName: row.recipeName,
            chamberPressure: row.chamberPressure,
            temperature: row.temperature,
            operatorId: row.operatorId,
        };
    }
}
