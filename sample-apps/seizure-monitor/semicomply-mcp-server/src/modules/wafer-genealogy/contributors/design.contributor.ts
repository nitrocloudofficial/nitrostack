import { Injectable } from '@nitrostack/core';
import { GenealogyContributor, GenealogyEvent } from '../genealogy-types.js';
import { GoogleSheetsService } from '../../google-sheets/google-sheets.service.js';

@Injectable({ deps: [GoogleSheetsService] })
export class DesignContributor implements GenealogyContributor {
    readonly sourceName = 'Design Revisions';

    constructor(private readonly sheets: GoogleSheetsService) {}

    async fetchEvents(batchId: string): Promise<GenealogyEvent[]> {
        const rows = await this.sheets.fetchSheet('Design Revisions');

        const matching = rows.filter(
            (row: Record<string, string>) =>
                row.lotId === batchId ||
                row.revisionId?.toLowerCase().includes(batchId.toLowerCase()) ||
                row.ipBlock?.toLowerCase().includes(batchId.toLowerCase()),
        );

        return matching.map((row: Record<string, string>) => ({
            timestamp: row.timestamp || new Date().toISOString(),
            source: this.sourceName,
            processStep: `Design — ${row.ipBlock || 'Unknown Block'}`,
            details: {
                revisionId: row.revisionId,
                designer: row.designer,
                ipBlock: row.ipBlock,
                changes: row.changes,
                lotId: row.lotId || '',
            },
        }));
    }
}
