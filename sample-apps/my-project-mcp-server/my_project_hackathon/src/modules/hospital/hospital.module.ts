import { Module } from '@nitrostack/core';
import { HospitalDataService } from './hospital.data.service.js';
import { HospitalTools } from './hospital.tools.js';

@Module({
  name: 'hospital',
  description: 'Hospital Agent — case entry and CGHS-based cost estimates',
  controllers: [HospitalTools],
  providers: [HospitalDataService],
  // Exported so the Orchestrator module can inject HospitalDataService directly
  exports: [HospitalDataService]
})
export class HospitalModule {}
