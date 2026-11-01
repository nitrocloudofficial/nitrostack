import { Module } from '@nitrostack/core';
import { IntakeTools } from './intake.tools.js';

@Module({
  name: 'intake',
  description: 'CVE and advisory analysis against OSV',
  controllers: [IntakeTools]
})
export class IntakeModule {}
