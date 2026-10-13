import { Injectable } from '@nitrostack/core';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service.js';

export interface DesignRevision {
    revisionId: string;
    designer: string;
    ipBlock: string;
    changes: string;
    timestamp: string;
}

@Injectable({ deps: [GoogleSheetsService] })
export class DesignService {
    constructor(private readonly sheets: GoogleSheetsService) {}

    async getRevision(revisionId: string): Promise<DesignRevision | undefined> {
        const map = await this.sheets.fetchSheetAsMap('Design Revisions', 'revisionId');
        const row = map[revisionId];
        if (!row) return undefined;
        return {
            revisionId: row.revisionId,
            designer: row.designer,
            ipBlock: row.ipBlock,
            changes: row.changes,
            timestamp: row.timestamp,
        };
    }
}
