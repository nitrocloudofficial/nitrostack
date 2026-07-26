import { Module } from '@nitrostack/core';

import { DockingController } from './docking.controller.js';

@Module({ name: 'docking', controllers: [DockingController] })
export class DockingModule {}
