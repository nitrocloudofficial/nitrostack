import { Module } from '@nitrostack/core';
import { QaTools } from './qa.tools.js';
import { QaService } from './qa.service.js';

@Module({
  name: 'qa',
  description: 'Quality Assurance Analyst — testing strategy and code quality standards',
  controllers: [QaTools],
  providers: [QaService],
  exports: [QaService],
})
export class QaModule {}
