import { Module } from '@nitrostack/core';
import { LinearService } from './linear.service.js';
import { LinearTools } from './linear.tools.js';

@Module({
  name: 'linear',
  description: 'Linear tickets: real GraphQL API with mock fallback (demo mode)',
  controllers: [LinearTools],
  providers: [LinearService],
})
export class LinearModule {}
