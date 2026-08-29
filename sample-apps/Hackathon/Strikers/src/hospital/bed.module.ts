import { Module } from '@nitrostack/core';
import { BedTools } from './bed.tools.js';

@Module({
  name: 'hospital-bed',
  description: 'Manage hospital bed inventory',
  controllers: [BedTools],
})
export class BedModule {}
