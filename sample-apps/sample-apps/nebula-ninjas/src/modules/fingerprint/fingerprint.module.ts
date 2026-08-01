import { Module } from '@nitrostack/core';
import { FingerprintService } from './fingerprint.service.js';
import { SharedModule } from '../shared/shared.module.js';

@Module({
    name: 'fingerprint',
    description: 'Tool description fingerprinting — pin and verify tool hashes',
    imports: [SharedModule],
    providers: [FingerprintService],
    exports: [FingerprintService],
})
export class FingerprintModule {}
