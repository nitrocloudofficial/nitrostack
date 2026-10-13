import { Module } from '@nitrostack/core';
import { ServicesModule } from '../../services/services.module.js';
import { MaintenanceAgent } from './maintenance.agent.js';
import { MaintenanceTools } from './maintenance.tools.js';

@Module({
  name: 'maintenance',
  description: 'Maintenance planning, ticket creation, and inventory handoff',
  imports: [ServicesModule],
  providers: [MaintenanceAgent],
  controllers: [MaintenanceTools],
})
export class MaintenanceModule {}
