import { Module } from '@nitrostack/core';
import { StoreService } from './store.service.js';
import { StoreTools } from './store.tools.js';

@Module({
  name: 'store',
  description: 'Durable JSON-file commitment store with serverless persistence fallbacks',
  controllers: [StoreTools],
  providers: [StoreService],
})
export class StoreModule {}
