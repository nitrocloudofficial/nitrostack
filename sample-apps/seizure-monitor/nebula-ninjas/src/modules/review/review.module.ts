import { Module } from '@nitrostack/core';
import { ReviewService } from './review.service.js';
import { ReviewTools } from './review.tools.js';
import { LedgerModule } from '../ledger/ledger.module.js';
import { FingerprintModule } from '../fingerprint/fingerprint.module.js';

@Module({
    name: 'review',
    description: 'Human review queue — approve/deny flagged calls and drift detections',
    imports: [LedgerModule, FingerprintModule],
    controllers: [ReviewTools],
    providers: [ReviewService],
    exports: [ReviewService],
})
export class ReviewModule {}
