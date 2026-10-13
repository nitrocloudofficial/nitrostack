import { Module } from '@nitrostack/core';
import { CryptoService } from './crypto.service.js';

@Module({
    name: 'shared',
    description: 'Shared utilities and cryptographic services for Sentinel Gateway',
    providers: [CryptoService],
    exports: [CryptoService],
})
export class SharedModule {}
