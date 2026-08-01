import { Module } from '@nitrostack/core';
import { DatasetTools } from './dataset.tools.js';

@Module({
  name: 'dataset',
  description: 'Query Neon PostgreSQL Database for sensor logs',
  controllers: [DatasetTools],
  exports: [DatasetTools],
})
export class DatasetModule {}
