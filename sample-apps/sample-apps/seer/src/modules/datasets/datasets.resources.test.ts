import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExecutionContext } from '@nitrostack/core';
import { DatasetsResources } from './datasets.resources.js';
import { DatasetsService } from './datasets.service.js';

const context = {} as ExecutionContext;

test('serves the public dataset catalogue as a resource payload', async () => {
  const resources = new DatasetsResources(new DatasetsService());

  const result = await resources.getCatalogue('seer://datasets', context);

  assert.equal(result.datasets[0]?.id, 'employee-compensation');
  assert.equal(result.datasets[1]?.id, 'employee-attrition');
  assert.equal('fileName' in result.datasets[0]!, false);
});

test('serves the employee compensation resource as CSV text', async () => {
  const resources = new DatasetsResources(new DatasetsService());

  const result = await resources.getEmployeeCompensationCsv('seer://datasets/employee-compensation', context);

  assert.match(result, /^employee_id,years_experience,education_level,/);
});

test('serves the employee attrition resource as CSV text', async () => {
  const resources = new DatasetsResources(new DatasetsService());

  const result = await resources.getEmployeeAttritionCsv('seer://datasets/employee-attrition', context);

  assert.match(result, /^tenure_years,monthly_hours,performance_rating,department,work_arrangement,attrition/);
});

test('serves every classic dataset resource as CSV text', async () => {
  const resources = new DatasetsResources(new DatasetsService());
  const cases = [
    [resources.getIrisCsv.bind(resources), 'seer://datasets/iris', 'sepal_length_cm,sepal_width_cm,petal_length_cm,petal_width_cm,species'],
    [resources.getTitanicCsv.bind(resources), 'seer://datasets/titanic', 'survived,passenger_class,sex,age,siblings_spouses,parents_children,fare,embarkation_port'],
    [resources.getWineCsv.bind(resources), 'seer://datasets/wine', 'cultivar,alcohol,malic_acid,ash,alcalinity_of_ash,magnesium,total_phenols'],
    [resources.getAutoMpgCsv.bind(resources), 'seer://datasets/auto-mpg', 'mpg,cylinders,displacement,horsepower,weight,acceleration,model_year,origin'],
  ] as const;

  for (const [read, uri, header] of cases) {
    const result = await read(uri, context);
    assert.match(result, new RegExp(`^${header}`));
  }
});
