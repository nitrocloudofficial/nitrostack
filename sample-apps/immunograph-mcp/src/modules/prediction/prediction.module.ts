import { Module } from '@nitrostack/core';

import { PredictionController } from './prediction.controller.js';

@Module({ name: 'prediction', controllers: [PredictionController] })
export class PredictionModule {}
