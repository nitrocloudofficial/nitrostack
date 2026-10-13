import { Module } from '@nitrostack/core';
import { CaseStoreService } from './case-store.service.js';

/**
 * SharedModule exports CaseStoreService so any module that needs live
 * case data from the Express backend can import SharedModule and inject it.
 */
@Module({
  name: 'shared',
  description: 'Shared services — CaseStoreService talks to the live Express backend',
  providers: [CaseStoreService],
  exports: [CaseStoreService],
})
export class SharedModule {}
