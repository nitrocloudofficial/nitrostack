import { ExecutionContext, Injectable, ResourceDecorator as Resource } from '@nitrostack/core';
import { DatasetsService } from './datasets.service.js';

@Injectable({ deps: [DatasetsService] })
export class DatasetsResources {
  constructor(private readonly datasets: DatasetsService) {}

  @Resource({
    uri: 'seer://datasets',
    name: 'Seer datasets',
    description: 'Catalogue of the approved CSV datasets available to Seer.',
    mimeType: 'application/json',
  })
  async getCatalogue(_uri: string, _context: ExecutionContext) {
    return { datasets: await this.datasets.list() };
  }

  @Resource({
    uri: 'seer://datasets/employee-compensation',
    name: 'Employee Compensation CSV',
    description: 'Synthetic employee compensation data for eligible supervised-learning analysis.',
    mimeType: 'text/csv',
  })
  async getEmployeeCompensationCsv(_uri: string, _context: ExecutionContext) {
    return this.datasets.readCsvText('employee-compensation');
  }

  @Resource({
    uri: 'seer://datasets/employee-attrition',
    name: 'Employee Attrition CSV',
    description: 'Synthetic employee attrition data for eligible supervised-learning classification.',
    mimeType: 'text/csv',
  })
  async getEmployeeAttritionCsv(_uri: string, _context: ExecutionContext) {
    return this.datasets.readCsvText('employee-attrition');
  }

  @Resource({
    uri: 'seer://datasets/iris',
    name: 'Iris CSV',
    description: 'Classic flower-measurement data for three-way species classification.',
    mimeType: 'text/csv',
  })
  async getIrisCsv(_uri: string, _context: ExecutionContext) {
    return this.datasets.readCsvText('iris');
  }

  @Resource({
    uri: 'seer://datasets/titanic',
    name: 'Titanic CSV',
    description: 'Historical passenger data for educational survival classification; not causal or individual decision-making data.',
    mimeType: 'text/csv',
  })
  async getTitanicCsv(_uri: string, _context: ExecutionContext) {
    return this.datasets.readCsvText('titanic');
  }

  @Resource({
    uri: 'seer://datasets/wine',
    name: 'Wine CSV',
    description: 'Classic chemical-measurement data for three-way cultivar classification.',
    mimeType: 'text/csv',
  })
  async getWineCsv(_uri: string, _context: ExecutionContext) {
    return this.datasets.readCsvText('wine');
  }

  @Resource({
    uri: 'seer://datasets/auto-mpg',
    name: 'Auto MPG CSV',
    description: 'Classic vehicle data for estimating city-cycle fuel economy.',
    mimeType: 'text/csv',
  })
  async getAutoMpgCsv(_uri: string, _context: ExecutionContext) {
    return this.datasets.readCsvText('auto-mpg');
  }
}
