import { Module } from '@nitrostack/core';
import { WebPresenceTools } from './web-presence.tools.js';
import { CaseStoreModule } from '../case-store/case-store.module.js';

@Module({
    name: 'web-presence',
    description: 'Digital footprint analysis — domain age, website activity, Google Business listing, social media, and online reviews',
    imports: [CaseStoreModule],
    controllers: [WebPresenceTools],
})
export class WebPresenceModule { }
