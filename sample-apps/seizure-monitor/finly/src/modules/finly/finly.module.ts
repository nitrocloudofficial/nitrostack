import { Module } from '@nitrostack/core';

import { FinlyService } from './finly.service.js';
import { FinlyTools } from './finly.tools.js';

@Module({
    name: 'finly',
    description:
        'Plain-language money checks with verified figures. Affordability judged against a ' +
        'weak month, product exit costs, glossary, and life-event roadmaps.',
    controllers: [FinlyTools],
    providers: [FinlyService],
})
export class FinlyModule { }
