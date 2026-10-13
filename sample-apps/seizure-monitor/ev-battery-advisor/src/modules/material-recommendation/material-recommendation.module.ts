import { Module } from '@nitrostack/core';
import { EvBatteryService } from '../ev-battery/ev-battery.service.js';
import { MaterialRecommendationTools } from './material-recommendation.tools.js';

@Module({
    name: 'material-recommendation',
    description: 'Ranks candidate materials via NSGA-II Pareto optimization and SHAP-explainable scoring',
    controllers: [MaterialRecommendationTools],
    providers: [EvBatteryService],
    exports: [EvBatteryService],
})
export class MaterialRecommendationModule { }
