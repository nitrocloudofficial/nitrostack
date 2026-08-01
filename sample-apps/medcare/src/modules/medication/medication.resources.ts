import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { loadJSON } from '../../shared/resource-loader.js';
import type { PharmacogenomicsDB, CounterfeitBatch, GeneMarkerData } from '../../shared/shared.types.js';

// ---------------------------------------------------------------------------
// MedicationResources — exposes the medication mock databases as MCP resources
// ---------------------------------------------------------------------------

export class MedicationResources {

  @Resource({
    uri: 'medication://pharmacogenomics',
    name: 'Pharmacogenomics Database',
    description: 'Gene-drug conflict database mapping genetic markers (CYP2C19, SLCO1B1, CYP2D6, TPMT) to drug interactions with severity ratings and clinical recommendations.',
    mimeType: 'application/json',
    examples: {
      response: {
        uri: 'medication://pharmacogenomics',
        description: 'Full pharmacogenomics marker-drug conflict database'
      }
    }
  })
  async getPharmacogenomicsDB(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching pharmacogenomics database resource');

    const db = loadJSON<PharmacogenomicsDB>('pharmacogenomics_db.json', 'pharmacogenomics database');

    // Build a summary view for the resource
    const markers = db.markers || {};
    const summary = Object.values(markers).map((m: GeneMarkerData) => ({
      gene: m.gene,
      full_name: m.full_name,
      variants: Object.entries(m.variants).map(([key, v]) => ({
        variant_key: key,
        phenotype: v.phenotype,
        conflict_count: v.conflicts.length
      }))
    }));

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          summary,
          full_database: db
        }, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'medication://counterfeit-batches',
    name: 'Reported Counterfeit Batches Registry',
    description: 'Internal registry of reported counterfeit or substandard medication batches flagged by pharmacovigilance networks and regulatory authorities.',
    mimeType: 'application/json',
    examples: {
      response: {
        uri: 'medication://counterfeit-batches',
        description: 'List of flagged counterfeit medication batches'
      }
    }
  })
  async getCounterfeitBatches(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching counterfeit batches registry resource');

    const batches = loadJSON<CounterfeitBatch[]>('reported_counterfeit_batches.json', 'counterfeit batches registry');

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          total_entries: batches.length,
          batches
        }, null, 2)
      }]
    };
  }
}
