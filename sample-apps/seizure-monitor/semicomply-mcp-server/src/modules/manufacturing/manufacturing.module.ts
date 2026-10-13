import { Module } from '@nitrostack/core';
import { ManufacturingMESService } from './manufacturing.service.js';
import { ManufacturingMESTools } from './manufacturing.tools.js';

@Module({
    name: 'manufacturing',
    description: 'Manufacturing MES module',
    controllers: [ManufacturingMESTools],
    providers: [ManufacturingMESService],
})
export class ManufacturingMESModule { }
