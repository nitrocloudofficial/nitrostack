import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExecutionContext } from '@nitrostack/core';
import { DatasetsTools, profileDatasetInputSchema } from './datasets.tools.js';

test('accepts every approved dataset ID and rejects unknown IDs', () => {
  for (const datasetId of ['employee-compensation', 'employee-attrition', 'iris', 'titanic', 'wine', 'auto-mpg']) {
    assert.equal(profileDatasetInputSchema.safeParse({ datasetId }).success, true);
  }
  assert.equal(profileDatasetInputSchema.safeParse({ datasetId: 'not-a-dataset' }).success, false);
});

test('profiles only the allowlisted packaged dataset and logs dimensions', async () => {
  let profileDatasetId = '';
  let profileCsvText = '';
  const tools = new DatasetsTools(
    { readCsv: async () => Buffer.from('annual_salary\n80000\n') } as never,
    {
      profile: async (datasetId: string, csv: Buffer) => {
        profileDatasetId = datasetId;
        profileCsvText = csv.toString('utf8');
        return {
          datasetId,
          dimensions: { rows: 1, columns: 1 },
          columns: [{
            name: 'annual_salary', type: 'numeric' as const, missingCount: 0, missingPercent: 0, uniqueCount: 1,
            numericSummary: { min: 80000, max: 80000, mean: 80000, median: 80000, standardDeviation: 0, q1: 80000, q3: 80000 },
            categories: [],
          }],
          duplicateRowCount: 0,
          targetCandidates: [],
          identifierCandidates: [],
          constantColumns: ['annual_salary'],
          unsupportedColumns: [],
          sampleRows: [{ annual_salary: 80000 }],
          warnings: [],
          charts: { missingValues: [], numericDistributions: [], categoryFrequencies: [] },
        };
      },
    } as never,
  );
  const records: unknown[] = [];
  const context = {
    requestId: 'test-request',
    logger: {
      info: (_message: string, metadata: unknown) => records.push(metadata),
      error: () => undefined,
    },
  } as unknown as ExecutionContext;

  const result = await tools.profileDataset({ datasetId: 'employee-compensation' }, context);

  assert.equal(profileDatasetId, 'employee-compensation');
  assert.match(profileCsvText, /annual_salary/);
  assert.equal(result.dimensions.rows, 1);
  assert.deepEqual(records, [{ datasetId: 'employee-compensation', rows: 1, columns: 1, requestId: 'test-request' }]);
});
