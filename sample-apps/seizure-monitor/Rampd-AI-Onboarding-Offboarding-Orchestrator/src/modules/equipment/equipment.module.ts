import { Module } from '@nitrostack/core';
import { EquipmentStore } from './equipment.store.js';
import { EquipmentTools } from './equipment.tools.js';

@Module({
  name: 'equipment',
  description: 'Equipment and asset management system for employee onboarding/offboarding',
  providers: [EquipmentStore],
  controllers: [EquipmentTools],
})
export class EquipmentModule {}
