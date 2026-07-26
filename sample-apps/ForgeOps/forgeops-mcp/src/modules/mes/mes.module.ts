import { Module } from '../../nitrostack.js';
import { MesTools } from './mes.tools.js';

@Module({
  name: 'mes',
  description: 'Manufacturing Execution System — batch history, production paths, queue events',
  controllers: [MesTools],
})
export class MesModule {}
