import { Module } from '@nitrostack/core';
import { PizzazService } from './pizzaz.service.js';
import { PizzazTools } from './pizzaz.tools.js';
import { PizzazTaskTools } from './pizzaz.tasks.js';

@Module({
    name: 'pizzaz',
    description: 'Pizza shop finder module',
    controllers: [PizzazTools, PizzazTaskTools],
    providers: [PizzazService],
})
export class PizzazModule { }
