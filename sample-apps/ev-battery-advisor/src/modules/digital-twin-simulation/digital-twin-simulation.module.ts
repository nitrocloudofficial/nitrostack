import { Module } from '@nitrostack/core';
import { EvBatteryService } from '../ev-battery/ev-battery.service.js';
import { DigitalTwinSimulationTools } from './digital-twin-simulation.tools.js';

@Module({
    name: 'digital-twin-simulation',
    description: 'Virtual electrochemical–thermal–mechanical simulation of battery material candidates via P2D-DFN and FEM models',
    controllers: [DigitalTwinSimulationTools],
    providers: [EvBatteryService],
    exports: [EvBatteryService],
})
export class DigitalTwinSimulationModule { }
