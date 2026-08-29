/**
 * Dataset Service
 *
 * Loads and parses the AI4I 2020 Predictive Maintenance CSV file.
 * Provides simple functions for future agents to query machine data.
 *
 * Design decisions:
 * - No external CSV library needed — the AI4I CSV is clean and simple
 * - Data is loaded once and cached in memory (only ~10,000 rows)
 * - All fields are parsed to their correct types (numbers vs strings)
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Types ────────────────────────────────────────────────────────

/** One row from the AI4I 2020 dataset, with fields parsed to proper types */
export interface MachineRecord {
  udi: number;                    // Unique identifier (1–10000)
  productId: string;              // e.g. "M14860", "L47181"
  type: string;                   // Quality type: L, M, or H
  airTemp: number;                // Air temperature [K]
  processTemp: number;            // Process temperature [K]
  rotationalSpeed: number;        // Rotational speed [rpm]
  torque: number;                 // Torque [Nm]
  toolWear: number;               // Tool wear [min]
  machineFailure: number;         // 0 = no failure, 1 = failure
  twf: number;                    // Tool Wear Failure flag
  hdf: number;                    // Heat Dissipation Failure flag
  pwf: number;                    // Power Failure flag
  osf: number;                    // Overstrain Failure flag
  rnf: number;                    // Random Failure flag
}

/** Summary statistics about the loaded dataset */
export interface DatasetStats {
  totalRecords: number;
  failureCount: number;
  noFailureCount: number;
  failureRate: string;            // e.g. "3.39%"
  typeBreakdown: Record<string, number>;  // e.g. { L: 6000, M: 2997, H: 1003 }
  columns: string[];
}

// ── CSV Header Mapping ───────────────────────────────────────────

/**
 * Maps the CSV column headers to our MachineRecord field names.
 * This is the ONLY place we hard-code the CSV structure —
 * if the CSV headers ever change, update this map.
 */
const HEADER_MAP: Record<string, keyof MachineRecord> = {
  'UDI':                       'udi',
  'Product ID':                'productId',
  'Type':                      'type',
  'Air temperature [K]':       'airTemp',
  'Process temperature [K]':   'processTemp',
  'Rotational speed [rpm]':    'rotationalSpeed',
  'Torque [Nm]':               'torque',
  'Tool wear [min]':           'toolWear',
  'Machine failure':           'machineFailure',
  'TWF':                       'twf',
  'HDF':                       'hdf',
  'PWF':                       'pwf',
  'OSF':                       'osf',
  'RNF':                       'rnf',
};

/** Fields that should be parsed as numbers (everything except productId and type) */
const NUMERIC_FIELDS = new Set<string>([
  'udi', 'airTemp', 'processTemp', 'rotationalSpeed',
  'torque', 'toolWear', 'machineFailure',
  'twf', 'hdf', 'pwf', 'osf', 'rnf',
]);

// ── In-memory Cache ──────────────────────────────────────────────

let cachedRecords: MachineRecord[] | null = null;
let cachedHeaders: string[] | null = null;

// ── Public Functions ─────────────────────────────────────────────

/**
 * Load the CSV file and return all records.
 * Results are cached so the file is only read once.
 */
export function loadDataset(csvPath?: string): MachineRecord[] {
  if (cachedRecords) return cachedRecords;

  const filePath = csvPath ?? path.join(process.cwd(), 'ai4i2020.csv');
  let raw = fs.readFileSync(filePath, 'utf-8');

  // Strip UTF-8 BOM if present (some CSV editors add this invisible character)
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  }

  const lines = raw.split(/\r?\n/).filter(line => line.trim() !== '');

  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }

  // Parse header row
  const headers = lines[0].split(',');
  cachedHeaders = headers;

  // Validate that expected columns exist
  const missingColumns: string[] = [];
  for (const expectedHeader of Object.keys(HEADER_MAP)) {
    if (!headers.includes(expectedHeader)) {
      missingColumns.push(expectedHeader);
    }
  }
  if (missingColumns.length > 0) {
    throw new Error(`CSV is missing expected columns: ${missingColumns.join(', ')}`);
  }

  // Build an index: header position → our field name
  const headerIndex: { csvIndex: number; fieldName: keyof MachineRecord }[] = [];
  for (let i = 0; i < headers.length; i++) {
    const mapped = HEADER_MAP[headers[i]];
    if (mapped) {
      headerIndex.push({ csvIndex: i, fieldName: mapped });
    }
  }

  // Parse data rows
  cachedRecords = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const record: any = {};

    for (const { csvIndex, fieldName } of headerIndex) {
      const rawValue = values[csvIndex]?.trim() ?? '';
      if (NUMERIC_FIELDS.has(fieldName)) {
        record[fieldName] = Number(rawValue);
      } else {
        record[fieldName] = rawValue;
      }
    }

    cachedRecords.push(record as MachineRecord);
  }

  return cachedRecords;
}

/**
 * Get a single machine record by its UDI (1-based unique identifier).
 * Returns undefined if not found.
 */
export function getMachineByUdi(udi: number): MachineRecord | undefined {
  const records = loadDataset();
  return records.find(r => r.udi === udi);
}

/**
 * Get summary statistics about the dataset.
 */
export function getDatasetStats(): DatasetStats {
  const records = loadDataset();

  const failureCount = records.filter(r => r.machineFailure === 1).length;
  const typeBreakdown: Record<string, number> = {};
  for (const r of records) {
    typeBreakdown[r.type] = (typeBreakdown[r.type] ?? 0) + 1;
  }

  return {
    totalRecords: records.length,
    failureCount,
    noFailureCount: records.length - failureCount,
    failureRate: ((failureCount / records.length) * 100).toFixed(2) + '%',
    typeBreakdown,
    columns: cachedHeaders ?? [],
  };
}

/**
 * Clear the cache (useful for testing or if the CSV is updated).
 */
export function clearCache(): void {
  cachedRecords = null;
  cachedHeaders = null;
}
