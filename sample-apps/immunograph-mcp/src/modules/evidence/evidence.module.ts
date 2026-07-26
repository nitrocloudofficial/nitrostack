import { Module } from '@nitrostack/core';

import { EvidenceController } from './evidence.controller.js';

@Module({ name: 'evidence', controllers: [EvidenceController] })
export class EvidenceModule {}
