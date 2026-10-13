import { Module } from '@nitrostack/core';
import { EvBatteryService } from '../ev-battery/ev-battery.service.js';
import { KnowledgeBaseTools } from './knowledge-base.tools.js';

@Module({
    name: 'knowledge-base',
    description: 'Continuously-updated EV battery materials knowledge base with ingestion, validation, compatibility querying, and feedback-loop retraining',
    controllers: [KnowledgeBaseTools],
    providers: [EvBatteryService],
    exports: [EvBatteryService],
})
export class KnowledgeBaseModule { }
