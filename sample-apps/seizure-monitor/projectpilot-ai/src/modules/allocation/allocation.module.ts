import { Module } from '@nitrostack/core';
import { AllocationTools } from './allocation.tools.js';
import { AllocationService } from './allocation.service.js';

@Module({
  name: 'allocation',
  description: 'Assigns team members to roles and builds task schedules',

  controllers: [
    AllocationTools,
  ],

  providers: [
    AllocationTools,
    AllocationService,
  ],

  exports: [
    AllocationService,
  ],
})
export class AllocationModule {}