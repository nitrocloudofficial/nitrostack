import { Module } from '@nitrostack/core';
import { MlClientModule } from '../ml-client/ml-client.module.js';
import { DatasetsResources } from './datasets.resources.js';
import { DatasetsService } from './datasets.service.js';
import { DatasetsTools } from './datasets.tools.js';

@Module({
  name: 'datasets',
  description: 'Approved packaged datasets and deterministic profile tools.',
  imports: [MlClientModule],
  controllers: [DatasetsResources, DatasetsTools],
  providers: [DatasetsService],
  exports: [DatasetsService],
})
export class DatasetsModule {}
