import { Module } from '@nitrostack/core';
import { MaintenanceTools } from './maintenance.tools.js';

@Module({
  name: 'maintenance',
  description: 'Maintenance operations and tools',
  controllers: [MaintenanceTools]
})
export class MaintenanceModule {}
