import { Injectable } from '@nitrostack/core';
import { RakshaNetService } from './rakshanet.service.js';

@Injectable({ deps: [RakshaNetService] })
export class RakshaNetTaskTools {
    constructor(
        private readonly rakshaNetService: RakshaNetService,
    ) {}
}