import { Module } from '@nitrostack/core';
import { RouterTools } from './router.tools.js';

@Module({
  name: 'router',
  description: 'AIDE main router agent',
  controllers: [RouterTools]
})
export class RouterModule {}