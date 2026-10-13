/**
 * DiagnosticsService — Diagnostics support module logic.
 * Interacts with ClinicalTablesService for ICD-10-CM and embedded lab reference ranges.
 */
import { Injectable } from '@nitrostack/core';
import { ClinicalTablesService } from '../../integrations/clinicaltables.service.js';
import { loadDataJson } from '../../data/load-json.js';

const labRangesData = loadDataJson('lab-reference-ranges.json');
const labExplanationsData = loadDataJson('lab-explanations.json');

export type LabFlag = 'low' | 'normal' | 'high' | 'critical_low' | 'critical_high' | 'unknown';

type UnitConversion = {
  value: number;
  unit: string;
  converted: boolean;
};

function normalizeUnit(unit: string): string {
  return unit
    .trim()
    .toLowerCase()
    .replace(/[\u00b5\u03bc]/g, 'u')
    .replace(/\s+/g, '')
    .replace(/per/g, '/');
}

const TEST_ALIASES: Record<string, string> = {
  'complete blood count': 'cbc',
  'comprehensive metabolic panel': 'cmp',
  'lipid panel': 'lipid_panel',
  'thyroid stimulating hormone': 'tsh',
};

const ANALYTE_ALIASES: Record<string, string> = {
  'white blood cell count': 'wbc',
  'white blood cells': 'wbc',
  'wbc count': 'wbc',
  'red blood cell count': 'rbc',
  'red blood cells': 'rbc',
  'rbc count': 'rbc',
  'hemoglobin a1c': 'hba1c',
  'glycated hemoglobin': 'hba1c',
  a1c: 'hba1c',
  'co2': 'bicarbonate',
  'carbon dioxide': 'bicarbonate',
  glucose: 'glucose',
  'blood glucose': 'glucose',
  'serum glucose': 'glucose',
  cholesterol: 'total_cholesterol',
  'total cholesterol': 'total_cholesterol',
  'ldl cholesterol': 'ldl',
  'hdl cholesterol': 'hdl',
  'triglyceride': 'triglycerides',
};

function normalizeLookup(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function levenshtein(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j++) {
      const current = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[right.length];
}

function nearestSuggestions(query: string, candidates: string[], limit = 3): string[] {
  const normalizedQuery = normalizeLookup(query);
  return candidates
    .map((candidate) => ({ candidate, distance: levenshtein(normalizedQuery, normalizeLookup(candidate)) }))
    .sort((left, right) => left.distance - right.distance || left.candidate.localeCompare(right.candidate))
    .slice(0, limit)
    .filter(({ distance, candidate }) => distance <= Math.max(2, Math.ceil(normalizeLookup(candidate).length / 2)))
    .map(({ candidate }) => candidate);
}

/** Converts supported alternate units into the embedded table's canonical unit. */
function convertToCanonicalUnit(
  analyte: string,
  value: number,
  unit: string,
  canonicalUnit: string,
): UnitConversion {
  const input = normalizeUnit(unit);
  if (input === normalizeUnit(canonicalUnit)) {
    return { value, unit: canonicalUnit, converted: false };
  }

  const factorByAnalyte: Record<string, Record<string, number>> = {
    glucose: { 'mmol/l': 18.0182 },
    creatinine: { 'umol/l': 1 / 88.4 },
    total_cholesterol: { 'mmol/l': 38.67 },
    ldl: { 'mmol/l': 38.67 },
    hdl: { 'mmol/l': 38.67 },
    triglycerides: { 'mmol/l': 88.57 },
  };

  const factor = factorByAnalyte[analyte]?.[input];
  if (factor === undefined) {
    throw new Error(
      `VALIDATION_ERROR: Unsupported unit "${unit}" for ${analyte}. Expected ${canonicalUnit}`,
    );
  }

  return {
    value: value * factor,
    unit: canonicalUnit,
    converted: true,
  };
}

@Injectable({ deps: [ClinicalTablesService] })
export class DiagnosticsService {
  private readonly labRanges: Record<
    string,
    {
      name: string;
      canonical_unit: string;
      low: number;
      high: number;
      critical_low?: number;
      critical_high?: number;
      possible_causes_low: string[];
      possible_causes_high: string[];
    }
  > = labRangesData.analytes;

  private readonly labExplanations: Record<
    string,
    {
      test_name: string;
      what_it_measures: string;
      why_ordered: string;
      preparation: string[];
    }
  > = labExplanationsData.explanations;

  constructor(private readonly clinicalTables: ClinicalTablesService) {}

  private resolveAnalyteKey(analyte: string): string | undefined {
    const normalized = normalizeLookup(analyte);
    if (this.labRanges[analyte.toLowerCase().trim()]) return analyte.toLowerCase().trim();
    if (this.labRanges[normalized]) return normalized;
    const alias = ANALYTE_ALIASES[analyte.toLowerCase().trim()] ?? ANALYTE_ALIASES[normalized];
    if (alias && this.labRanges[alias]) return alias;

    const matched = Object.keys(this.labRanges).find(
      (key) => normalizeLookup(this.labRanges[key].name) === normalized,
    );
    return matched;
  }

  /** Lookup ICD-10-CM code for condition name. */
  async lookupCondition(query: string, maxResults: number = 10) {
    const results = await this.clinicalTables.searchIcd10(query, maxResults);
    return { results };
  }

  /** Rule-based interpretation of lab value against reference ranges. */
  interpretLabValue(analyte: string, value: number, unit: string) {
    const key = this.resolveAnalyteKey(analyte);
    const rangeObj = key ? this.labRanges[key] : undefined;

    if (!rangeObj) {
      return {
        analyte,
        value,
        unit,
        flag: 'unknown' as LabFlag,
        reference_range: null,
        possible_causes: [],
        suggestions: nearestSuggestions(analyte, Object.keys(this.labRanges)),
        supported_analytes: Object.keys(this.labRanges),
        caveats: `Analyte "${analyte}" not in reference range table. Supported analytes: ${Object.keys(this.labRanges).join(', ')}.`,
      };
    }

    const conversion = convertToCanonicalUnit(key as string, value, unit, rangeObj.canonical_unit);
    const canonicalValue = conversion.value;
    const canonicalUnit = conversion.unit;

    let flag: LabFlag = 'normal';
    let possibleCauses: string[] = [];

    if (rangeObj.critical_low !== undefined && canonicalValue <= rangeObj.critical_low) {
      flag = 'critical_low';
      possibleCauses = rangeObj.possible_causes_low;
    } else if (rangeObj.critical_high !== undefined && canonicalValue >= rangeObj.critical_high) {
      flag = 'critical_high';
      possibleCauses = rangeObj.possible_causes_high;
    } else if (canonicalValue < rangeObj.low) {
      flag = 'low';
      possibleCauses = rangeObj.possible_causes_low;
    } else if (canonicalValue > rangeObj.high) {
      flag = 'high';
      possibleCauses = rangeObj.possible_causes_high;
    } else {
      flag = 'normal';
      possibleCauses = ['Within normal reference range.'];
    }

    return {
      analyte: rangeObj.name,
      value: canonicalValue,
      unit: canonicalUnit,
      original_value: value,
      original_unit: unit,
      flag,
      reference_range: {
        low: rangeObj.low,
        high: rangeObj.high,
        unit: rangeObj.canonical_unit,
      },
      possible_causes: possibleCauses,
      caveats:
        'Reference ranges vary slightly by laboratory, method, age, and sex. ' +
        'Results should always be interpreted by the ordering physician in clinical context.' +
        (conversion.converted ? ` Value converted from ${unit} to ${rangeObj.canonical_unit}.` : ''),
    };
  }

  /** Patient-friendly lab test explanation. */
  explainLabTest(testName: string) {
    const normalized = normalizeLookup(testName);
    const alias = TEST_ALIASES[testName.toLowerCase().trim()] ?? TEST_ALIASES[normalized];
    const explanationKey = alias && this.labExplanations[alias]
      ? alias
      : this.labExplanations[normalized]
        ? normalized
        : Object.keys(this.labExplanations).find(
          (key) => normalizeLookup(this.labExplanations[key].test_name) === normalized,
        );
    const explanation = explanationKey ? this.labExplanations[explanationKey] : undefined;

    if (!explanation) {
      return {
        test_name: testName,
        what_it_measures: `General laboratory test: ${testName}.`,
        why_ordered: 'Ordered to assess organ function, metabolic state, or screen for disease.',
        preparation: ['Follow instructions provided by your healthcare team or testing lab.'],
        suggestions: nearestSuggestions(testName, Object.keys(this.labExplanations)),
        reading_level: 'grade6',
      };
    }

    return {
      ...explanation,
      reading_level: 'grade6',
    };
  }

  /** Symptom text to candidate ICD-10-CM codes for documentation support. */
  async symptomToCodes(symptom: string) {
    const results = await this.clinicalTables.searchIcd10(symptom, 10);
    return {
      symptom,
      candidate_codes: results,
      usage_note:
        'ICD-10-CM candidate codes are provided for clinical documentation assistance only, NOT automated diagnosis.',
    };
  }
}
