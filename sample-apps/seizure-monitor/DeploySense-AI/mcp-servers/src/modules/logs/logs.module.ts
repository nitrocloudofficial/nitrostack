import { Module } from '@nitrostack/core';
import { LogsService } from './logs.service.js';
import { LogsTools } from './logs.tools.js';
import { ConfigModule } from '../config/config.module.js';

@Module({
  name: 'logsmodule',
  imports: [ConfigModule],
  controllers: [LogsTools],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}

