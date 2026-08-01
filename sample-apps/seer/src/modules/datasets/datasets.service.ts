import { readFile } from 'node:fs/promises';
import { Injectable } from '@nitrostack/core';
import { datasetCatalogSchema, type DatasetDefinition, type PublicDatasetDefinition } from './datasets.types.js';

const dataDirectory = new URL('../../data/', import.meta.url);
const catalogUrl = new URL('dataset-catalog.json', dataDirectory);

export class DatasetNotFoundError extends Error {
  constructor(datasetId: string) {
    super(`Dataset '${datasetId}' is not available.`);
    this.name = 'DatasetNotFoundError';
  }
}

@Injectable({ deps: [] })
export class DatasetsService {
  async list(): Promise<PublicDatasetDefinition[]> {
    const catalog = await this.loadCatalog();
    return catalog.datasets.map(({ fileName: _fileName, ...dataset }) => dataset);
  }

  async get(datasetId: string): Promise<DatasetDefinition> {
    const catalog = await this.loadCatalog();
    const dataset = catalog.datasets.find((candidate) => candidate.id === datasetId);
    if (!dataset) {
      throw new DatasetNotFoundError(datasetId);
    }
    return dataset;
  }

  async readCsv(datasetId: string): Promise<Buffer> {
    const dataset = await this.get(datasetId);
    return readFile(new URL(dataset.fileName, dataDirectory));
  }

  async readCsvText(datasetId: string): Promise<string> {
    return (await this.readCsv(datasetId)).toString('utf8');
  }

  private async loadCatalog() {
    const content = await readFile(catalogUrl, 'utf8');
    return datasetCatalogSchema.parse(JSON.parse(content));
  }
}
