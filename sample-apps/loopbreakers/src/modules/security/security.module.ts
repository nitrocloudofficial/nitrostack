import { Module } from '@nitrostack/core';
import { SecurityTools } from './security.tools.js';

@Module({
  name: 'security',
  description: 'Enterprise Security MCP Module for threat detection, asset scanning, and system isolation.',
  controllers: [SecurityTools]
})
export class SecurityModule {}
