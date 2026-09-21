import { Module } from '@nitrostack/core';
import { LaboratoryTools } from './laboratory.tools.js';

@Module({
  name: 'laboratory',
  description: 'Manage lab tests and reports',
  controllers: [LaboratoryTools],
})
export class LaboratoryModule {}
