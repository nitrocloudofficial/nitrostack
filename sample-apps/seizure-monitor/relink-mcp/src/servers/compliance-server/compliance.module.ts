import { Module } from '@nitrostack/core';
import { ComplianceTools } from './compliance.tools.js';

@Module({
  name: 'ComplianceModule',
  controllers: [ComplianceTools],
  providers: [ComplianceTools],
  exports: [ComplianceTools],
})
export class ComplianceModule {}
