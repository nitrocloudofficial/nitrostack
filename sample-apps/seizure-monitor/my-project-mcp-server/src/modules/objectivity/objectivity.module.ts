import { Module } from '@nitrostack/core';
import { HospitalModule } from '../hospital/hospital.module.js';
import { InsurerModule } from '../insurer/insurer.module.js';
import { ObjectivityTools } from './objectivity.tools.js';

@Module({
  name: 'objectivity',
  description: 'Case Objectivity Agent — inconsistency-checked, insurer-ready case reports',
  imports: [HospitalModule, InsurerModule],
  controllers: [ObjectivityTools],
  exports: [ObjectivityTools]
})
export class ObjectivityModule {}
