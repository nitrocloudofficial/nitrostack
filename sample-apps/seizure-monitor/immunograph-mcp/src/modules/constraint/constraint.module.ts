import { Module } from '@nitrostack/core';

import { ConstraintController } from './constraint.controller.js';

@Module({ name: 'constraint', controllers: [ConstraintController] })
export class ConstraintModule {}
