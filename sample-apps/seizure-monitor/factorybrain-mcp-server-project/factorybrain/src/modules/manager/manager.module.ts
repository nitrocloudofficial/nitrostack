import { Module } from '@nitrostack/core';
import { ServicesModule } from '../../services/services.module.js';
import { FactoryConfigService } from './factory-config.service.js';
import { ManagerAgent } from './manager.agent.js';
import { ManagerTools } from './manager.tools.js';

@Module({
  name: 'manager',
  description: 'Executive reporting, policy approval, human decisions, audit, and workflow resumption',
  imports: [ServicesModule],
  providers: [FactoryConfigService, ManagerAgent],
  controllers: [ManagerTools],
  exports: [FactoryConfigService, ManagerAgent],
})
export class ManagerModule {}
