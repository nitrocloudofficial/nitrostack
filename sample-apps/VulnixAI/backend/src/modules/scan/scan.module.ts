import { Module } from '@nitrostack/core';
import { ScanTools } from './scan.tools.js';
import { ScanResources } from './scan.resources.js';

@Module({
  name: 'scan',
  description: 'VulnixAI scanner module',
  controllers: [ScanTools, ScanResources],
  providers: [],
})
export class ScanModule {}
