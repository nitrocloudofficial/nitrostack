import { Injectable } from '@nitrostack/core';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service.js';

export interface ShippingCompliance {
    shipmentId: string;
    productId: string;
    origin: string;
    destination: string;
    eccnClassification: string;
    hsCode: string;
    applicableTariffs: string;
    status: string;
}

@Injectable({ deps: [GoogleSheetsService] })
export class ShippingTradeService {
    constructor(private readonly sheets: GoogleSheetsService) {}

    async getCompliance(shipmentId: string): Promise<ShippingCompliance | undefined> {
        const map = await this.sheets.fetchSheetAsMap('Shipping', 'shipmentId');
        const row = map[shipmentId];
        if (!row) return undefined;
        return this.rowToCompliance(row);
    }

    async getByProductId(productId: string): Promise<ShippingCompliance[]> {
        const rows = await this.sheets.fetchSheet('Shipping');
        return rows
            .filter((row) => row.productId === productId)
            .map((row) => this.rowToCompliance(row));
    }

    private rowToCompliance(row: Record<string, string>): ShippingCompliance {
        return {
            shipmentId: row.shipmentId,
            productId: row.productId || '',
            origin: row.origin,
            destination: row.destination,
            eccnClassification: row.eccnClassification,
            hsCode: row.hsCode,
            applicableTariffs: row.applicableTariffs,
            status: row.status,
        };
    }
}
