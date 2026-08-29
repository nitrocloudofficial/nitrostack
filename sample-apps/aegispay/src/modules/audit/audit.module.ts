import { Module } from '@nitrostack/core';
import { AuditTools } from './audit.tools.js';

@Module({
  name: 'audit',
  description: 'Read access to the hash-chained audit trail',
  controllers: [AuditTools],
  providers: [],
})
export class AuditModule {}
