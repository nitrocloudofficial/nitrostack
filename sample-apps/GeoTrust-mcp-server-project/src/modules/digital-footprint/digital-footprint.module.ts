import { Module } from '@nitrostack/core';
import { DigitalFootprintTools } from './digital-footprint.tools.js';
import { CaseStoreModule } from '../case-store/case-store.module.js';

@Module({
    name: 'digital-footprint',
    description: 'Digital Footprint Sub-agent — live RDAP domain lookup and web presence analysis',
    imports: [CaseStoreModule],
    controllers: [DigitalFootprintTools],
})
export class DigitalFootprintModule {}
