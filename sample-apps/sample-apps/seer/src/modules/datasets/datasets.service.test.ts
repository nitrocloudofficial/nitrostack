import assert from 'node:assert/strict';
import test from 'node:test';
import { DatasetNotFoundError, DatasetsService } from './datasets.service.js';

test('lists the packaged datasets without exposing their file paths', async () => {
  const datasets = new DatasetsService();
  const catalogue = await datasets.list();

  assert.deepEqual(catalogue.map(({ id }) => id), [
    'employee-compensation', 'employee-attrition', 'iris', 'titanic', 'wine', 'auto-mpg',
  ]);
  assert.equal(catalogue.every((dataset) => !('fileName' in dataset)), true);
});

test('reads the compiled CSV asset', async () => {
  const datasets = new DatasetsService();
  const csv = await datasets.readCsvText('employee-compensation');

  assert.match(csv, /^employee_id,years_experience,education_level,/);
  assert.equal(csv.trim().split('\n').length, 1501);
});

test('reads the compiled employee attrition CSV asset', async () => {
  const datasets = new DatasetsService();
  const csv = await datasets.readCsvText('employee-attrition');

  assert.match(csv, /^tenure_years,monthly_hours,performance_rating,department,work_arrangement,attrition/);
  assert.equal(csv.trim().split('\n').length, 421);
});

test('reads all classic CSV snapshots with their expected schema and row count', async () => {
  const datasets = new DatasetsService();
  const expected = [
    ['iris', 'sepal_length_cm,sepal_width_cm,petal_length_cm,petal_width_cm,species', 151],
    ['titanic', 'survived,passenger_class,sex,age,siblings_spouses,parents_children,fare,embarkation_port', 1310],
    ['wine', 'cultivar,alcohol,malic_acid,ash,alcalinity_of_ash,magnesium,total_phenols', 179],
    ['auto-mpg', 'mpg,cylinders,displacement,horsepower,weight,acceleration,model_year,origin', 399],
  ] as const;

  for (const [datasetId, header, lineCount] of expected) {
    const csv = await datasets.readCsvText(datasetId);
    assert.match(csv, new RegExp(`^${header}`));
    assert.equal(csv.trim().split('\n').length, lineCount);
  }
});

test('rejects non-allowlisted dataset IDs', async () => {
  const datasets = new DatasetsService();

  await assert.rejects(datasets.readCsv('not-a-dataset'), DatasetNotFoundError);
});
