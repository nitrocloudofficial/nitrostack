import { Module } from '@nitrostack/core';
import { SuccessionService } from './succession.service.js';
import { SuccessionController } from './succession.tools.js';

@Module({
  name: 'succession',
  description: 'AI Succession Engine',
  controllers: [
    SuccessionController
  ],
  providers: [
    SuccessionService
  ]
})
export class SuccessionModule {}
