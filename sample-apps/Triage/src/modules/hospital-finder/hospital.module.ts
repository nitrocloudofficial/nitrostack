// src/modules/hospital-finder/hospital.module.ts
import { Module } from '@nitrostack/core';
import { HospitalService } from './hospital.service.js';
import { HospitalTools } from './hospital.tools.js';

@Module({
  name: 'hospital-finder',
  description: 'Finds nearest suitable hospital by location and specialty',
  controllers: [HospitalTools],
  providers: [HospitalService],
})
export class HospitalModule {}