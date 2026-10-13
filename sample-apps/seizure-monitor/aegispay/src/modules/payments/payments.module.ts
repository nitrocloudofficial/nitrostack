import { Module } from '@nitrostack/core';
import { PaymentsTools } from './payments.tools.js';
import { ApprovalService } from '../../services/approval.service.js';

@Module({
  name: 'payments',
  description: 'Approval requests and controller-gated payment execution',
  controllers: [PaymentsTools],
  providers: [ApprovalService],
})
export class PaymentsModule {}
