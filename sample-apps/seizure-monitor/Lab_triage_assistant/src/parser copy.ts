/**
 * Lab Report Parser
 * 
 * Extracts test results from raw lab report text.
 * Handles colon-separated format: "TestName : value unit"
 */

import { resolveTestName } from './canonicalTests.js';

export interface ParsedTest {
  testName: string; // Canonical name
  value: string | number;
  unit: string;
}

export interface ParseResult {
  tests: ParsedTest[];
  unparsedLines: string[];
}

/**
 * Parse a raw lab report text into structured test results.
 * 
 * Expected format (one test per line):
 *   Hemoglobin : 13.5 g/dL
 *   WBC : 7.2 K/uL
 *   SGPT : 45 U/L
 * 
 * @param reportText Raw lab report text
 * @returns Parsed tests and unparsed lines
 */
export function parseLabReport(reportText: string): ParseResult {
  const tests: ParsedTest[] = [];
  const unparsedLines: string[] = [];

  const lines = reportText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const parsed = parseLine(trimmed);
    if (parsed) {
      tests.push(parsed);
    } else {
      unparsedLines.push(trimmed);
    }
  }

  return { tests, unparsedLines };
}

/**
 * Parse a single line in format "TestName : value unit"
 * 
 * @param line Single line from report
 * @returns Parsed test or null if line cannot be parsed
 */
function parseLine(line: string): ParsedTest | null {
  // Regex: "TestName : value unit"
  // Captures: (1) test name, (2) numeric value, (3) unit (rest of line)
  const match = line.match(/^\s*([^:]+)\s*:\s*([\d.]+)\s*(.*)$/);

  if (!match) {
    return null;
  }

  const rawTestName = match[1].trim();
  const valueStr = match[2].trim();
  const unit = match[3].trim();

  // Resolve raw test name to canonical name
  const canonicalName = resolveTestName(rawTestName);
  if (!canonicalName) {
    // Test name not recognized; skip this line
    return null;
  }

  // Try to parse value as number; fall back to string
  const value = isNaN(Number(valueStr)) ? valueStr : Number(valueStr);

  return {
    testName: canonicalName,
    value,
    unit
  };
}
