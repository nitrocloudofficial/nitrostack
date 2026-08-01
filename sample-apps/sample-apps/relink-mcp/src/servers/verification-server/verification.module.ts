import { Module } from '@nitrostack/core';
import { VerificationTools } from './verification.tools.js';

@Module({
  name: 'VerificationModule',
  controllers: [VerificationTools],
  providers: [VerificationTools],
  exports: [VerificationTools],
})
export class VerificationModule {}
