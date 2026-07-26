import { Module } from '@nitrostack/core';

import { ReportController } from './report.controller.js';

@Module({ name: 'report', controllers: [ReportController] })
export class ReportModule {}
