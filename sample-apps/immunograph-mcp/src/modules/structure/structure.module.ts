import { Module } from '@nitrostack/core';

import { StructureController } from './structure.controller.js';

@Module({ name: 'structure', controllers: [StructureController] })
export class StructureModule {}
