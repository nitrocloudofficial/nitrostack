import { Module } from '@nitrostack/core';
import { IntakeTools } from './intake.tools.js';

@Module({
  name: 'IntakeModule',
  controllers: [IntakeTools],
  providers: [IntakeTools],
  exports: [IntakeTools],
})
export class IntakeModule {}
