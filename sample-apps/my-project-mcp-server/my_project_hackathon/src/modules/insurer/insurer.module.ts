import { Module } from '@nitrostack/core';
import { InsurerDataService } from './insurer.data.service.js';
import { InsurerTools } from './insurer.tools.js';
import { SharedModule } from '../shared/shared.module.js';

@Module({
  name: 'insurer',
  description: 'Insurer Agent — cashless status, claim decisions, network status',
  imports: [SharedModule],
  controllers: [InsurerTools],
  providers: [InsurerDataService],
  exports: [InsurerDataService],
})
export class InsurerModule {}
