import { Module } from '@nitrostack/core';
import { VerifyTools } from './verify.tools.js';

@Module({
  name: 'verify',
  description: 'Verify a patch by building and testing it on an isolated GitHub Actions runner',
  controllers: [VerifyTools]
})
export class VerifyModule {}
