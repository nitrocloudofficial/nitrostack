import { Module } from '@nitrostack/core';
import { SecurityTools } from './security.tools.js';

@Module({
  name: 'security',
  description: 'TASIE autonomous security scanning, exploit proof and remediation',
  controllers: [SecurityTools],
})
export class SecurityModule {}
