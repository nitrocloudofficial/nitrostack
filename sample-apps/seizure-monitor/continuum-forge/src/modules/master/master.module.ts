import { Module } from '@nitrostack/core';
import { MasterTools } from './master.tools.js';

@Module({
  name: 'master',
  description: 'Master orchestrator for the Continuum Forge pipeline',
  controllers: [MasterTools],
  exports: [MasterTools],
})
export class MasterModule {}
