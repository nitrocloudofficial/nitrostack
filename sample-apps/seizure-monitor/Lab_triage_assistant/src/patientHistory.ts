/**
 * Patient Visit History (in-memory, no external database)
 *
 * Tracks flagged test values across visits, keyed by an opaque patientId
 * the caller supplies. Lives only in process memory for the life of the
 * running server — resets on restart. This is intentional: it lets
 * run_full_triage show real trends across visits within a session/demo
 * without adding a database dependency.
 */

export interface VisitTest {
  testName: string;
  value: number;
  unit: string;
  status: string;
}

export interface VisitRecord {
  timestamp: string;
  tests: VisitTest[];
}

export type TrendDirection = 'RISING' | 'FALLING' | 'STABLE' | 'INSUFFICIENT_DATA';

export interface TestTrend {
  testName: string;
  unit: string;
  values: { timestamp: string; value: number }[];
  direction: TrendDirection;
}

const historyByPatient = new Map<string, VisitRecord[]>();

/**
 * Record a visit's flagged test results for a patient.
 */
export function recordVisit(patientId: string, tests: VisitTest[]): void {
  if (!patientId) return;

  const visits = historyByPatient.get(patientId) ?? [];
  visits.push({ timestamp: new Date().toISOString(), tests });
  historyByPatient.set(patientId, visits);
}

/**
 * Compute per-test trends across all recorded visits for a patient.
 * A test needs at least 2 visits to have a meaningful direction; a
 * >5% change from the first to the most recent recorded value counts
 * as rising/falling, otherwise it's considered stable.
 */
export function getTrends(patientId: string): TestTrend[] {
  const visits = historyByPatient.get(patientId) ?? [];
  if (visits.length === 0) return [];

  const testNames = new Set<string>();
  for (const visit of visits) {
    for (const test of visit.tests) testNames.add(test.testName);
  }

  const trends: TestTrend[] = [];

  for (const testName of testNames) {
    const values: { timestamp: string; value: number }[] = [];
    let unit = '';

    for (const visit of visits) {
      const match = visit.tests.find((t) => t.testName === testName);
      if (match) {
        values.push({ timestamp: visit.timestamp, value: match.value });
        unit = match.unit;
      }
    }

    if (values.length < 2) {
      trends.push({ testName, unit, values, direction: 'INSUFFICIENT_DATA' });
      continue;
    }

    const first = values[0].value;
    const last = values[values.length - 1].value;
    const delta = last - first;
    const threshold = Math.abs(first) * 0.05;

    let direction: TrendDirection = 'STABLE';
    if (delta > threshold) direction = 'RISING';
    else if (delta < -threshold) direction = 'FALLING';

    trends.push({ testName, unit, values, direction });
  }

  return trends;
}

export function getVisitCount(patientId: string): number {
  return (historyByPatient.get(patientId) ?? []).length;
}
