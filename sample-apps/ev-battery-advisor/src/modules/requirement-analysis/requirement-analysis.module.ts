import { Module } from '@nitrostack/core';
import { EvBatteryService } from '../ev-battery/ev-battery.service.js';
import { RequirementAnalysisTools } from './requirement-analysis.tools.js';

@Module({
    name: 'requirement-analysis',
    description: 'Converts natural-language EV specs into structured weighted requirements for the battery advisor pipeline',
    controllers: [RequirementAnalysisTools],
    providers: [EvBatteryService],
    exports: [EvBatteryService],
})
export class RequirementAnalysisModule { }
