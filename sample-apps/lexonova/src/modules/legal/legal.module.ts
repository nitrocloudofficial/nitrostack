import { Module } from '@nitrostack/core';
import { LegalService } from './legal.service.js';
import { LegalTools } from './legal.tools.js';
import { LegalTaskTools } from './legal.tasks.js';
import { LegalPrompts } from './legal.prompts.js';

@Module({
    name: 'legal',
    description: 'Legal rights assistant module for Indian workers',
    controllers: [LegalTools, LegalTaskTools],
    providers: [LegalService, LegalPrompts],
})
export class LegalModule { }