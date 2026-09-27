import { Module } from '../../nitrostack.js';
import { MaintenanceTools } from './maintenance.tools.js';

@Module({
  name: 'maintenance',
  description: 'Maintenance Management — machine alerts, condition monitoring, service history',
  controllers: [MaintenanceTools],
})
export class MaintenanceModule {}
