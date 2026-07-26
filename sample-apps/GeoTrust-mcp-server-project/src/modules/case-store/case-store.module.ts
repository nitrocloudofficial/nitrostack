import { Module } from '@nitrostack/core';
import { CaseStoreService } from './case-store.service.js';
import { CaseStoreTools } from './case-store.tools.js';

@Module({
    name: 'case-store',
    description: 'Shared in-memory case state store',
    providers: [
        CaseStoreService,
        CaseStoreTools
    ],
    exports: [CaseStoreService],
})
export class CaseStoreModule { }
