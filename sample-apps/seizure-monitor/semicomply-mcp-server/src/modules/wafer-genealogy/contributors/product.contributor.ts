import { Injectable } from '@nitrostack/core';
import { GenealogyContributor, GenealogyEvent } from '../genealogy-types.js';
import { GoogleSheetsService } from '../../google-sheets/google-sheets.service.js';

@Injectable({ deps: [GoogleSheetsService] })
export class ProductContributor implements GenealogyContributor {
    readonly sourceName = 'Product Specs';

    constructor(private readonly sheets: GoogleSheetsService) {}

    async fetchEvents(batchId: string): Promise<GenealogyEvent[]> {
        const rows = await this.sheets.fetchSheet('Product Specs');

        const matching = rows.filter(
            (row: Record<string, string>) =>
                row.lotId === batchId ||
                row.productId === batchId,
        );

        return matching.map((row: Record<string, string>) => {
            let certs: string[] = [];
            if (row.complianceCertifications) {
                try {
                    certs = JSON.parse(row.complianceCertifications);
                } catch {
                    certs = row.complianceCertifications.split(',').map((s: string) => s.trim());
                }
            }

            return {
                timestamp: new Date().toISOString(),
                source: this.sourceName,
                processStep: `Product Reference — ${row.productId || 'Unknown'}`,
                details: {
                    productId: row.productId,
                    datasheetUrl: row.datasheetUrl,
                    operatingVoltage: row.operatingVoltage,
                    maxThermalThreshold: row.maxThermalThreshold,
                    complianceCertifications: certs,
                    lotId: row.lotId || '',
                },
            };
        });
    }
}
