import { Module } from '@nitrostack/core';
import { QualityTestService } from './quality.service.js';
import { QualityTestTools } from './quality.tools.js';

@Module({
    name: 'quality',
    description: 'Quality test module',
    controllers: [QualityTestTools],
    providers: [QualityTestService],
})
export class QualityTestModule { }
