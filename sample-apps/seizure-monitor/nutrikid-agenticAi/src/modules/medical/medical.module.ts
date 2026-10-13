import { Module } from '@nitrostack/core';
import { MedicalTools } from './medical.tools.js';
import { MedicalResources } from './medical.resources.js';
import { MedicalPrompts } from './medical.prompts.js';

@Module({
  name: 'medical',
  description: 'Medical and clinical intelligence module',
  controllers: [
    MedicalTools,
    MedicalResources,
    MedicalPrompts,
  ],
  providers: [
    MedicalTools,
    MedicalResources,
    MedicalPrompts,
  ],
  exports: [
    MedicalTools,
    MedicalResources,
    MedicalPrompts,
  ],
})
export class MedicalModule {}
