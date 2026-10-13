import { Module } from '@nitrostack/core';
import { RfqTools } from './rfq.tools.js';

@Module({ name: 'rfq', description: 'RFQ generation tool', controllers: [RfqTools] })
export class RfqModule {}
