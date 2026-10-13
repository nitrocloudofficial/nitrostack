import { Injectable } from '@nitrostack/core';
import { GenealogyContributor, GenealogyEvent } from '../genealogy-types.js';
import { GoogleSheetsService } from '../../google-sheets/google-sheets.service.js';

@Injectable({ deps: [GoogleSheetsService] })
export class ShippingContributor implements GenealogyContributor {
    readonly sourceName = 'Shipping & Trade';

    constructor(private readonly sheets: GoogleSheetsService) {}

    async fetchEvents(batchId: string): Promise<GenealogyEvent[]> {
        const rows = await this.sheets.fetchSheet('Shipping');

        const matching = rows.filter(
            (row: Record<string, string>) =>
                row.lotId === batchId ||
                row.shipmentId === batchId ||
                row.productId === batchId,
        );

        const events = matching.map((row: Record<string, string>) => ({
            timestamp: row.timestamp || new Date().toISOString(),
            source: this.sourceName,
            processStep: `Shipping — ${row.origin || ''} → ${row.destination || ''}`,
            details: {
                shipmentId: row.shipmentId,
                productId: row.productId,
                origin: row.origin,
                destination: row.destination,
                eccnClassification: row.eccnClassification,
                hsCode: row.hsCode,
                applicableTariffs: row.applicableTariffs,
                status: row.status,
                lotId: row.lotId || '',
                routeOrder: parseInt(row.routeOrder, 10) || 0,
            },
        }));

        events.sort(
            (a, b) => (a.details.routeOrder as number) - (b.details.routeOrder as number),
        );

        return events;
    }
}
