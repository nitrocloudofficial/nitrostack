import { Injectable, OnEvent, defaultLogger } from '@nitrostack/core';

interface StepReportLike {
  seq: number;
  tool: string;
  manualAction: string | null;
}

/** Subscribes to transaction lifecycle events for structured audit logging. */
@Injectable()
export class TxnAuditListener {
  private readonly logger = defaultLogger;

  @OnEvent('txn.rollback.finished')
  async onRollbackFinished(e: {
    txnId: string;
    status: string;
    reversed: unknown[];
    notReversed: StepReportLike[];
  }): Promise<void> {
    if (e.status === 'PARTIAL') {
      this.logger.error('PARTIAL ROLLBACK — MANUAL INTERVENTION REQUIRED', {
        txnId: e.txnId,
        unreversedCount: e.notReversed.length,
        steps: e.notReversed.map((s) => ({ seq: s.seq, tool: s.tool, manualAction: s.manualAction })),
      });
    }
  }

  @OnEvent('txn.step.recorded')
  async onStepRecorded(e: { txnId: string; seq: number; tool: string; class: string }): Promise<void> {
    this.logger.info('Step journalled', e);
  }

  @OnEvent('txn.committed')
  async onCommitted(e: { txnId: string }): Promise<void> {
    this.logger.info('Transaction committed', e);
  }
}
