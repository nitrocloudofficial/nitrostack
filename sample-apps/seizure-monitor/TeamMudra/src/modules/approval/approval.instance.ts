import { SQLiteApprovalRepository } from './approval.repository.sqlite.js';
import { ApprovalService } from './approval.service.js';

/**
 * Module-level singleton, same pattern as procurement.instance.ts.
 */
const approvalRepository = new SQLiteApprovalRepository();

export const approvalService = new ApprovalService(approvalRepository);