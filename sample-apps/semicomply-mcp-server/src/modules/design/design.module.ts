import { Module } from '@nitrostack/core';
import { DesignService } from './design.service.js';
import { DesignTools } from './design.tools.js';

@Module({
    name: 'design',
    description: 'Design module',
    controllers: [DesignTools],
    providers: [DesignService],
})
export class DesignModule { }
