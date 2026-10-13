import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Drug Interaction Entry
 */
export interface DrugInteraction {
  drug1: string;
  drug2: string;
  description: string;
}

/**
 * Patient Arrival Record
 */
export interface PatientArrivalRecord {
  patient_id: string;
  site_id: string;
  triage_nurse_id: string;
  arrival_mode: string;
  arrival_hour: number;
  arrival_day: string;
  arrival_month: number;
  arrival_season: string;
  shift: string;
  age: number;
}

/**
 * Data Loader Service
 *
 * Loads and manages CSV data files:
 * - db_drug_interactions.csv: Drug-to-drug interaction mappings
 * - train-selected-columns.csv: Patient arrival records
 *
 * Provides lookup methods for querying the loaded data.
 */
@Injectable()
export class DataLoaderService {
  private drugInteractions: Map<string, DrugInteraction[]> = new Map();
  private patientRecords: Map<string, PatientArrivalRecord> = new Map();
  private isLoaded = false;

  constructor() {
    this.loadData();
  }

  /**
   * Load both CSV files on initialization
   */
  private loadData(): void {
    try {
      this.loadDrugInteractions();
      this.loadPatientRecords();
      this.isLoaded = true;
    } catch (error) {
      throw new Error(`Failed to load data files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load drug interactions from CSV
   * Format: Drug 1, Drug 2, Interaction Description
   */
  private loadDrugInteractions(): void {
    const csvPath = path.resolve(__dirname, '../../..', 'db_drug_interactions.csv');

    if (!fs.existsSync(csvPath)) {
      throw new Error(`Drug interactions CSV not found at ${csvPath}`);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter((line) => line.trim());

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (handle quoted fields)
      const parts = this.parseCSVLine(line);
      if (parts.length < 3) continue;

      const drug1 = parts[0].toLowerCase().trim();
      const drug2 = parts[1].toLowerCase().trim();
      const description = parts[2].trim();

      if (!drug1 || !drug2) continue;

      const interaction: DrugInteraction = { drug1, drug2, description };

      // Store bidirectional lookup (drug1-drug2 and drug2-drug1)
      const key1 = `${drug1}|${drug2}`;
      const key2 = `${drug2}|${drug1}`;

      if (!this.drugInteractions.has(key1)) {
        this.drugInteractions.set(key1, []);
      }
      this.drugInteractions.get(key1)!.push(interaction);

      if (!this.drugInteractions.has(key2)) {
        this.drugInteractions.set(key2, []);
      }
      this.drugInteractions.get(key2)!.push(interaction);
    }
  }

  /**
   * Load patient arrival records from CSV
   */
  private loadPatientRecords(): void {
    const csvPath = path.resolve(__dirname, '../../..', 'train-selected-columns.csv');

    if (!fs.existsSync(csvPath)) {
      throw new Error(`Patient records CSV not found at ${csvPath}`);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter((line) => line.trim());

    // Parse header
    const header = this.parseCSVLine(lines[0]);
    const headerMap = Object.fromEntries(header.map((h, i) => [h.toLowerCase(), i]));

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = this.parseCSVLine(line);
      if (parts.length < header.length) continue;

      const record: PatientArrivalRecord = {
        patient_id: parts[headerMap['patient_id']] || '',
        site_id: parts[headerMap['site_id']] || '',
        triage_nurse_id: parts[headerMap['triage_nurse_id']] || '',
        arrival_mode: parts[headerMap['arrival_mode']] || '',
        arrival_hour: parseInt(parts[headerMap['arrival_hour']] || '0', 10),
        arrival_day: parts[headerMap['arrival_day']] || '',
        arrival_month: parseInt(parts[headerMap['arrival_month']] || '0', 10),
        arrival_season: parts[headerMap['arrival_season']] || '',
        shift: parts[headerMap['shift']] || '',
        age: parseInt(parts[headerMap['age']] || '0', 10),
      };

      if (record.patient_id) {
        this.patientRecords.set(record.patient_id, record);
      }
    }
  }

  /**
   * Parse a CSV line, handling quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Check if data is loaded
   */
  isDataLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get drug interactions between two drugs
   */
  getDrugInteractions(drug1: string, drug2: string): DrugInteraction[] {
    const key = `${drug1.toLowerCase()}|${drug2.toLowerCase()}`;
    return this.drugInteractions.get(key) || [];
  }

  /**
   * Get all interactions for a drug (as first or second drug)
   */
  getAllInteractionsForDrug(drug: string): DrugInteraction[] {
    const drugLower = drug.toLowerCase();
    const interactions: DrugInteraction[] = [];

    for (const [key, value] of this.drugInteractions.entries()) {
      if (key.includes(drugLower)) {
        interactions.push(...value);
      }
    }

    return interactions;
  }

  /**
   * Get patient arrival record by patient ID
   */
  getPatientRecord(patientId: string): PatientArrivalRecord | null {
    return this.patientRecords.get(patientId) || null;
  }

  /**
   * Get all patient records
   */
  getAllPatientRecords(): PatientArrivalRecord[] {
    return Array.from(this.patientRecords.values());
  }

  /**
   * Get statistics about loaded data
   */
  getDataStats() {
    return {
      totalDrugInteractions: this.drugInteractions.size,
      totalPatientRecords: this.patientRecords.size,
      isLoaded: this.isLoaded,
    };
  }
}
