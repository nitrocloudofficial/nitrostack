import { Module } from '@nitrostack/core';
import { ReportService } from './report.service.js';
import { ReportTools } from './report.tools.js';
import { ConfigModule } from '../config/config.module.js';

@Module({
  name: 'reportmodule',
  imports: [ConfigModule],
  controllers: [ReportTools],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}

