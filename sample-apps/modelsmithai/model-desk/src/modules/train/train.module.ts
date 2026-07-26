import { Module } from '@nitrostack/core';
import { TrainTools } from './train.tools.js';

@Module({
  name: 'train',
  description: 'Model training via Python ML sidecar',
  controllers: [TrainTools]
})
export class TrainModule {}
