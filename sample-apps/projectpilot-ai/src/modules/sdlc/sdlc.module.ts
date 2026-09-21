import { Module } from '@nitrostack/core';
import { SdlcTools } from './sdlc.tools.js';
import { SdlcService } from './sdlc.service.js';

@Module({
  name: 'sdlc',
  description: 'Evaluates and recommends suitable SDLC models for project scope',

  controllers: [
    SdlcTools,
  ],

  providers: [
    SdlcService,
    SdlcTools,
  ],

  exports: [
    SdlcService,
  ],
})
export class SdlcModule {}