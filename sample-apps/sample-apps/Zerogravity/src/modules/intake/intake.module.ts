import { Module } from '@nitrostack/core';
import { SubmitPatientIntakeTool } from './intake.tools.js';
import { GetPatientRecordTool } from './intake.tools.js';

@Module({
  name: 'intake',
  description: 'Patient intake and record management',
  controllers: [SubmitPatientIntakeTool, GetPatientRecordTool]
})
export class IntakeModule {}
