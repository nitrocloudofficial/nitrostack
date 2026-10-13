import { Injectable } from '@nitrostack/core';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service.js';

export interface ProductSpecs {
    productId: string;
    datasheetUrl: string;
    operatingVoltage: string;
    maxThermalThreshold: string;
    complianceCertifications: string[];
}

@Injectable({ deps: [GoogleSheetsService] })
export class ProductDocService {
    constructor(private readonly sheets: GoogleSheetsService) {}

    async getSpecs(productId: string): Promise<ProductSpecs | undefined> {
        const map = await this.sheets.fetchSheetAsMap('Product Specs', 'productId');
        const row = map[productId];
        if (!row) return undefined;

        let certs: string[] = [];
        if (row.complianceCertifications) {
            try {
                certs = JSON.parse(row.complianceCertifications);
            } catch {
                certs = row.complianceCertifications.split(',').map((s: string) => s.trim());
            }
        }

        return {
            productId: row.productId,
            datasheetUrl: row.datasheetUrl,
            operatingVoltage: row.operatingVoltage,
            maxThermalThreshold: row.maxThermalThreshold,
            complianceCertifications: certs,
        };
    }
}
