import { Module } from '@nitrostack/core';
import { UiUxTools } from './uiux.tools.js';
import { UiUxService } from './uiux.service.js';

@Module({
  name: 'uiux',
  description: 'UI/UX Integrator — design tokens, palette and component inventory',
  controllers: [UiUxTools],
  providers: [UiUxService],
  exports: [UiUxService],
})
export class UiUxModule {}
