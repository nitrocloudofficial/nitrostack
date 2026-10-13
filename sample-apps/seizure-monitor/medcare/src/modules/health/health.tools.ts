import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { loadJSON, writeJSON } from '../../shared/resource-loader.js';
import type { PatientDB, HealthEntry } from '../../shared/shared.types.js';

// ---------------------------------------------------------------------------
// HealthTools — Agent 1: Health Memory Agent
// ---------------------------------------------------------------------------

export class HealthTools {

  // -------------------------------------------------------------------------
  // Tool 1: extract_health_data
  // -------------------------------------------------------------------------

  @Tool({
    name: 'extract_health_data',
    description:
      'Parses structured lab report text into a timeline of health entries. Accepts pre-structured lab text (e.g., copy-pasted from a PDF report) and extracts test name, value, unit, reference range, date, and status. Intentionally simple mock parser — no real OCR/NLP required.',
    inputSchema: z.object({
      report_text: z.string().describe(
        'Structured lab report text. Each test should be on its own line in a recognizable format such as: "Test Name: value unit [range] DATE" or "Test Name | value | unit | range | date"'
      ),
      patient_id: z.string().optional().describe('Optional patient ID to associate the extracted entries with (e.g., P001)')
    }),
    examples: {
      request: {
        report_text: 'HbA1c: 7.4 % [< 7.0] 2024-10-15\nINR: 2.3 [2.0-3.0] 2024-11-01\neGFR: 68 mL/min/1.73m² [> 60] 2024-10-15',
        patient_id: 'P001'
      },
      response: {
        patient_id: 'P001',
        extracted_count: 3,
        entries: [],
        parsed_at: '2024-11-01T00:00:00.000Z'
      }
    }
  })
  @Widget('patient-profile')
  async extractHealthData(input: { report_text: string; patient_id?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Extracting health data from report text', {
      patient_id: input.patient_id,
      text_length: input.report_text.length
    });

    const entries: HealthEntry[] = [];
    const lines = input.report_text.split(/\r?\n/).filter(line => line.trim().length > 0);

    // Common date pattern
    const datePattern = /(\d{4}-\d{2}-\d{2})/;
    // Colon-style: "Test Name: value unit [range] DATE"
    const colonStyle = /^([A-Za-z][A-Za-z0-9\s\/()-]+?):\s*([\d.]+)\s*([^[\d\|]*?)\s*(?:\[([^\]]*)\])?\s*(\d{4}-\d{2}-\d{2})?/;
    // Pipe-style: "Test Name | value | unit | range | date"
    const pipeStyle = /^([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let entry: Partial<HealthEntry> | null = null;

      // Attempt pipe-style first
      const pipeMatch = trimmed.match(pipeStyle);
      if (pipeMatch) {
        const [, testName, rawValue, unit, range, rawDate] = pipeMatch.map(s => s.trim());
        const numericValue = parseFloat(rawValue);
        entry = {
          test_name: testName,
          value: isNaN(numericValue) ? rawValue : numericValue,
          unit: unit || '',
          reference_range: range || '',
          date: rawDate || new Date().toISOString().split('T')[0],
          status: 'unknown'
        };
      } else {
        // Attempt colon-style
        const colonMatch = trimmed.match(colonStyle);
        if (colonMatch) {
          const [, testName, rawValue, unit, range] = colonMatch;
          const dateMatch = trimmed.match(datePattern);
          const numericValue = parseFloat(rawValue);
          entry = {
            test_name: testName.trim(),
            value: isNaN(numericValue) ? rawValue : numericValue,
            unit: (unit || '').trim(),
            reference_range: (range || '').trim(),
            date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
            status: 'unknown'
          };
        }
      }

      if (!entry || !entry.test_name) continue;

      // Determine status by comparing value to range
      entry.status = entry.value !== undefined
        ? this.computeStatus(entry.value, entry.reference_range || '')
        : 'unknown';
      entries.push(entry as HealthEntry);
    }

    ctx.logger.info('Health data extraction complete', {
      lines_processed: lines.length,
      entries_found: entries.length
    });

    return {
      patient_id: input.patient_id || null,
      extracted_count: entries.length,
      entries,
      parsing_notes: entries.length === 0
        ? 'No entries could be extracted. Ensure each test is on its own line in format: "Test Name: value unit [range] YYYY-MM-DD" or "Name | value | unit | range | date".'
        : `Successfully extracted ${entries.length} lab entry(ies).`,
      parsed_at: new Date().toISOString()
    };
  }

  // -------------------------------------------------------------------------
  // Tool 2: update_health_memory
  // -------------------------------------------------------------------------

  @Tool({
    name: 'update_health_memory',
    description:
      'Persists lab results into a patient\'s health memory (recent_lab_results). Accepts a patient ID and an array of lab entries to store. Updates the patient profile JSON, appending new results and replacing existing entries for the same test+date combination. Use this after extract_health_data to save parsed lab results.',
    inputSchema: z.object({
      patient_id: z.string().describe('Patient ID to update (e.g., P001, P002, P003)'),
      entries: z.array(z.object({
        test: z.string().describe('Name of the lab test (e.g., HbA1c, INR, eGFR)'),
        value: z.number().describe('Numeric result value'),
        unit: z.string().describe('Unit of measurement (e.g., %, mL/min/1.73m²)'),
        reference_range: z.string().describe('Reference range string (e.g., "< 7.0", "2.0-3.0", "> 60")'),
        status: z.enum(['normal', 'above_range', 'below_range', 'critical', 'unknown']).optional().describe('Result status relative to reference range'),
        date: z.string().describe('Date of the lab result in YYYY-MM-DD format')
      })).describe('Array of lab result entries to persist')
    }),
    examples: {
      request: {
        patient_id: 'P001',
        entries: [
          { test: 'HbA1c', value: 7.4, unit: '%', reference_range: '< 7.0', status: 'above_range', date: '2024-10-15' },
          { test: 'INR', value: 2.3, unit: '', reference_range: '2.0-3.0', status: 'normal', date: '2024-11-01' }
        ]
      },
      response: {
        patient_id: 'P001',
        patient_name: 'Arthur Krishnamurthy',
        updated_count: 2,
        total_lab_results: 5,
        updated_at: '2024-11-01T00:00:00.000Z'
      }
    }
  })
  @Widget('patient-profile')
  async updateHealthMemory(
    input: {
      patient_id: string;
      entries: Array<{
        test: string;
        value: number;
        unit: string;
        reference_range: string;
        status?: string;
        date: string;
      }>;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Updating health memory', {
      patient_id: input.patient_id,
      entry_count: input.entries.length
    });

    // Load current patient database
    const db = loadJSON<PatientDB>('patient_profile.json', 'patient profiles');

    const patient = db.patients.find(p => p.patient_id === input.patient_id);
    if (!patient) {
      throw new Error(`Patient with ID "${input.patient_id}" not found. Available IDs: ${db.patients.map(p => p.patient_id).join(', ')}`);
    }

    // Initialize recent_lab_results if missing
    if (!patient.recent_lab_results) {
      patient.recent_lab_results = [];
    }

    let updatedCount = 0;
    let addedCount = 0;

    for (const entry of input.entries) {
      // Auto-compute status if not provided
      const status = entry.status || this.computeStatusFromRange(entry.value, entry.reference_range);

      const labResult = {
        test: entry.test,
        value: entry.value,
        unit: entry.unit,
        reference_range: entry.reference_range,
        status,
        date: entry.date
      };

      // Check if an entry with the same test+date already exists → replace it
      const existingIndex = patient.recent_lab_results.findIndex(
        r => r.test === entry.test && r.date === entry.date
      );

      if (existingIndex >= 0) {
        patient.recent_lab_results[existingIndex] = labResult;
        updatedCount++;
      } else {
        patient.recent_lab_results.push(labResult);
        addedCount++;
      }
    }

    // Sort by date descending (most recent first)
    patient.recent_lab_results.sort((a, b) => b.date.localeCompare(a.date));

    // Persist back to disk
    writeJSON('patient_profile.json', db, 'patient profiles');

    ctx.logger.info('Health memory updated successfully', {
      patient: patient.name,
      added: addedCount,
      updated: updatedCount,
      total: patient.recent_lab_results.length
    });

    return {
      patient_id: patient.patient_id,
      patient_name: patient.name,
      added_count: addedCount,
      updated_count: updatedCount,
      total_lab_results: patient.recent_lab_results.length,
      current_results: patient.recent_lab_results,
      updated_at: new Date().toISOString()
    };
  }

  // -------------------------------------------------------------------------
  // Private: compute status from value vs reference range string
  // -------------------------------------------------------------------------

  private computeStatus(
    value: string | number,
    rangeStr: string
  ): 'normal' | 'above_range' | 'below_range' | 'critical' | 'unknown' {
    const numVal = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(numVal)) return 'unknown';
    return this.computeStatusFromRange(numVal, rangeStr);
  }

  private computeStatusFromRange(
    numVal: number,
    rangeStr: string
  ): 'normal' | 'above_range' | 'below_range' | 'critical' | 'unknown' {
    if (isNaN(numVal)) return 'unknown';

    const rangeLower = rangeStr.toLowerCase().trim();

    // Pattern: "> X" or "≥ X" (lower bound only)
    const greaterMatch = rangeLower.match(/^[>≥]\s*([\d.]+)/);
    if (greaterMatch) {
      const lower = parseFloat(greaterMatch[1]);
      return numVal >= lower ? 'normal' : 'below_range';
    }

    // Pattern: "< X" or "≤ X" (upper bound only)
    const lessMatch = rangeLower.match(/^[<≤]\s*([\d.]+)/);
    if (lessMatch) {
      const upper = parseFloat(lessMatch[1]);
      if (numVal > upper * 1.5) return 'critical';
      return numVal <= upper ? 'normal' : 'above_range';
    }

    // Pattern: "X – Y" or "X - Y" or "X to Y"
    const rangeMatch = rangeLower.match(/([\d.]+)\s*[-–to]+\s*([\d.]+)/);
    if (rangeMatch) {
      const lower = parseFloat(rangeMatch[1]);
      const upper = parseFloat(rangeMatch[2]);
      if (numVal < lower * 0.7 || numVal > upper * 1.5) return 'critical';
      if (numVal < lower) return 'below_range';
      if (numVal > upper) return 'above_range';
      return 'normal';
    }

    return 'unknown';
  }
}
