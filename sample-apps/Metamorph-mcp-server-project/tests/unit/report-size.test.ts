import { describe, it, expect } from 'vitest';
import { ReportCache, generateReport, type ReportSummary } from '../../src/modules/report/report.js';
import { linkProvider } from '../../src/modules/report/links.js';
import { dataOf, manyFindings } from '../helpers/report-fixtures.js';

// What a client receives for a tool result that has a widget: the JSON text AND the same object as structuredContent.
// scripts/conformance.mjs measures this envelope against a 20,000 character budget (docs/EXECUTION_PLAN.md section K).
const BUDGET = 20_000;
const envelope = (r: ReportSummary) => JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(r, null, 2) }], structuredContent: r }, null, 2).length;
const SECRET = 's'.repeat(40);

const CASES: Array<[string, () => ReturnType<typeof linkProvider>]> = [
  ['absolute links (METAMORPH_PUBLIC_URL set)', () => linkProvider({ secret: SECRET, publicUrl: 'https://metamorph.example.com/', routesActive: true })],
  ['relative links (HTTP routes, no METAMORPH_PUBLIC_URL)', () => linkProvider({ secret: SECRET, routesActive: true })],
  ['no links (stdio, no HTTP transport)', () => linkProvider({ secret: SECRET, routesActive: false })],
  ['no links (no secret)', () => linkProvider({ routesActive: true })]
];
const DATA: Array<[string, () => ReturnType<typeof dataOf>]> = [
  ['zero findings', () => dataOf([])],
  ['1 finding', () => dataOf(manyFindings(1))],
  ['3 findings', () => dataOf(manyFindings(3))]
];
// A long report renders a long PDF but the result carries only counts and links, so one slow case is enough.
const BIG: Array<[string, () => ReturnType<typeof dataOf>]> = [['200 findings', () => dataOf(manyFindings(200))]];

describe('generate_report result size', () => {
  for (const [linkName, mk] of CASES) {
    for (const [dataName, data] of linkName.startsWith('relative') ? [...DATA, ...BIG] : DATA) {
      it(`stays under ${BUDGET} characters: ${linkName}, ${dataName}`, async () => {
        const res = await generateReport(data(), mk(), new ReportCache());
        const size = envelope(res);
        console.log(`[report-size] ${linkName} | ${dataName}: ${size} chars`);
        expect(size).toBeLessThan(BUDGET);
      }, 30_000);
    }
  }
});
