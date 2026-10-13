import { Module } from '@nitrostack/core';
import { HistoryService } from './history.service.js';
import { HistoryController } from './history.controller.js';

@Module({
  name: 'history',
  description: 'Patient Electronic Health Record (EHR) Agent Module',
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService]
})
export class HistoryModule {}
