import { Module } from '@nitrostack/core';
import { AddressTools } from './address.tools.js';
import { CaseStoreModule } from '../case-store/case-store.module.js';

@Module({
    name: 'address',
    description: 'Address verification — GIS lookup, commercial/residential zone check, cross-reference with registry and utility bills',
    imports: [CaseStoreModule],
    controllers: [AddressTools],
})
export class AddressModule { }
