import { Module } from '@nitrostack/core';
import { InjectionService } from './injection.service.js';

@Module({
    name: 'injection',
    description: 'Injection detection — scans tool descriptions for hidden instructions',
    providers: [InjectionService],
    exports: [InjectionService],
})
export class InjectionModule {}
