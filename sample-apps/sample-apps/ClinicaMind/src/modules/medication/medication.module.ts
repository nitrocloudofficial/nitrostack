import { Module } from '@nitrostack/core';
import { MedicationService } from './medication.service.js';
import { MedicationController } from './medication.controller.js';

@Module({
  name: 'medication',
  description: 'Medication Safety & Interaction Agent Module',
  controllers: [MedicationController],
  providers: [MedicationService],
  exports: [MedicationService]
})
export class MedicationModule {}
