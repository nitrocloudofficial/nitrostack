import { Module } from '@nitrostack/core';
import { DatasetsModule } from '../datasets/datasets.module.js';
import { HelpTools } from './help.tools.js';

@Module({
  name: 'help',
  description: 'Server capabilities, approved datasets, tool order, and enforced limits.',
  imports: [DatasetsModule],
  controllers: [HelpTools],
})
export class HelpModule {}
