import { Module } from '@nitrostack/core';
import { ServicesModule } from '../../services/services.module.js';
import { MachineAgent } from './machine.agent.js';
import { MachineTools } from './machine.tools.js';

@Module({
  name: 'machine',
  description: 'Machine registry, telemetry analysis, and failure prediction',
  imports: [ServicesModule],
  providers: [MachineAgent],
  controllers: [MachineTools],
})
export class MachineModule {}
