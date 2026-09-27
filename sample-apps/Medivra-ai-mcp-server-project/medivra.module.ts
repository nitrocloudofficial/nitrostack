import { Module } from '@nitrostack/core';
import { MedivraGeminiService } from './medivra.gemini.service.js';
import { MedivraTools } from './medivra.tools.js';

@Module({
    name: 'medivra',
    description: 'Medivra AI — agentic healthcare assistant tools (prescription OCR/parsing, blood report analysis, health Q&A)',
    controllers: [MedivraTools],
    providers: [MedivraGeminiService],
})
export class MedivraModule { }
