import { Module } from '@nitrostack/core';
import { RegistryTools } from './registry.tools.js';
import { RegistryResources } from './registry.resources.js';
import { CaseStoreModule } from '../case-store/case-store.module.js';

@Module({
    name: 'registry',
    description: 'Business registry lookup and verification — checks registration status, name, address against Indian SME registry dataset',
    imports: [CaseStoreModule],
    controllers: [RegistryTools, RegistryResources],
})
export class RegistryModule { }
