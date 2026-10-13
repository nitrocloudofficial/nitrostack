import { Module } from '@nitrostack/core';
import { OperationsTools } from './operations.tools.js';
import { OperationsService } from './operations.service.js';

@Module({
  name: 'operations',
  description: 'Factory operations module - inventory, scheduling, production rerouting, ticketing',
  controllers: [OperationsTools],
  providers: [OperationsService]
})
export class OperationsModule {}
