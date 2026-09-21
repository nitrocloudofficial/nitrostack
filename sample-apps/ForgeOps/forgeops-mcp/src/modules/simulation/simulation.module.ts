import { Module } from '../../nitrostack.js';
import { SimulationTools } from './simulation.tools.js';

@Module({
  name: 'simulation',
  description: 'Simulation Engine — counterfactual scenarios, sensitivity analysis, comparisons',
  controllers: [SimulationTools],
})
export class SimulationModule {}
