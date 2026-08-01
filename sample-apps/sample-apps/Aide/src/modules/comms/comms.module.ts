import { Module } from '@nitrostack/core';
import { CommsTools } from './comms.tools.js';

@Module({
  name: 'comms',
  description: 'Communications module',
  controllers: [CommsTools]
})
export class CommsModule {}
