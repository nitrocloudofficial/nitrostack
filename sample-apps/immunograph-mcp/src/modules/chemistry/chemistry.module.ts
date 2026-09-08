import { Module } from '@nitrostack/core';

import { ChemistryController } from './chemistry.controller.js';

@Module({ name: 'chemistry', controllers: [ChemistryController] })
export class ChemistryModule {}
