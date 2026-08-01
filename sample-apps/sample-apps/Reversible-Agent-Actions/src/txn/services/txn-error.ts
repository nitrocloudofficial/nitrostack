import type { RollbackReport } from '../types.js';

/** Error thrown by transaction/journal services for invariant violations and illegal state transitions. */
export class TxnError extends Error {
  code: string;
  detail?: string;
  partialReport?: RollbackReport;
  operatorMessage: string;

  constructor(code: string, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'TxnError';
    this.code = code;
    this.detail = detail;
    this.operatorMessage = detail ? `${code}: ${detail}` : code;
  }
}
