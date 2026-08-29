import fs from 'fs/promises';
import path from 'path';
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { getCollection } from '../mongodb.js';
import { parseCsv, normalizeValue } from '../utils/csv.js';

const BASE_PATH = process.cwd();
const DATASET_PATH = path.join(BASE_PATH, 'data', 'datasets', 'FedCycleData071012.csv');
const RELEVANT_COLUMNS = new Set([
  'cycle_length',
  'menstrual_duration',
  'follicular_phase_length',
  'luteal_phase_length',
  'ovulation_day',
  'bleeding_intensity',
  'cycle_regular',
  'age'
]);

export class ImportCycleDatasetTool {
  @Tool({
    name: 'importCycleDataset',
    description: 'Import anonymized menstrual-cycle reference data from the local FedCycleData071012.csv dataset',
    inputSchema: z.object({
      force: z.boolean().optional()
    })
  })
  async importCycleDataset(input: any) {
    const raw = await fs.readFile(DATASET_PATH, 'utf-8');
    const rows = parseCsv(raw);
    const collection = await getCollection<any>('cycle_patterns');

    if (!rows.length) {
      return {
        status: 'success',
        importedCount: 0,
        skippedCount: 0,
        message: 'Dataset contains no rows.'
      };
    }

    const operations = rows.flatMap((row) => {
      const record: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(row)) {
        if (!RELEVANT_COLUMNS.has(key)) {
          continue;
        }

        const normalized = normalizeValue(value);
        if (normalized !== null) {
          record[key] = normalized;
        }
      }

      if (!Object.keys(record).length) {
        return [];
      }

      const filter = {
        cycle_length: record.cycle_length ?? null,
        menstrual_duration: record.menstrual_duration ?? null,
        ovulation_day: record.ovulation_day ?? null
      };

      return [{
        updateOne: {
          filter,
          update: { $setOnInsert: record },
          upsert: true
        }
      }];
    });

    if (!operations.length) {
      return {
        status: 'success',
        importedCount: 0,
        skippedCount: 0,
        message: 'No relevant records were found in the dataset.'
      };
    }

    const result = await collection.bulkWrite(operations, { ordered: false });

    return {
      status: 'success',
      importedCount: result.upsertedCount,
      skippedCount: operations.length - result.upsertedCount,
      totalRows: rows.length
    };
  }
}
