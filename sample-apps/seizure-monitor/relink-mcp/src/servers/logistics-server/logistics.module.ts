import { Module } from '@nitrostack/core';
import { LogisticsTools } from './logistics.tools.js';

@Module({
  name: 'LogisticsModule',
  controllers: [LogisticsTools],
  providers: [LogisticsTools],
  exports: [LogisticsTools],
})
export class LogisticsModule {}
