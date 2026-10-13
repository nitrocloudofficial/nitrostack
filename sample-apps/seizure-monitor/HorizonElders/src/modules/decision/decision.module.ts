import { Module } from '@nitrostack/core';
import { DecisionTools } from './decision.tools.js';

@Module({ name: 'decision', description: 'Supplier recommendation tool', controllers: [DecisionTools] })
export class DecisionModule {}
