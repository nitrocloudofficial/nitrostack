import { Module } from '@nitrostack/core';
import { EvBatteryService } from '../ev-battery/ev-battery.service.js';
import { DecisionReportingTools } from './decision-reporting.tools.js';

@Module({
    name: 'decision-reporting',
    description: 'TOPSIS-based final ranking, trade-off analysis, risk surfacing, confidence scoring, and interactive dashboard generation',
    controllers: [DecisionReportingTools],
    providers: [EvBatteryService],
    exports: [EvBatteryService],
})
export class DecisionReportingModule { }
