// ============================================================================
// FILE: src/controllers/dashboard-controller.ts
// PURPOSE: Wire handlers to UI state mutations and event handlers
// ============================================================================

import { AetherCareExecutionHandlers } from '../handlers/aethercare-execution-handlers.js';

export class DashboardController {
  private handlers: AetherCareExecutionHandlers;
  private uiState: any;

  constructor(handlers: AetherCareExecutionHandlers, uiState: any) {
    this.handlers = handlers;
    this.uiState = uiState;
  }

  /**
   * UI EVENT: Case Inspector "▶ Run Compliance Audit" button clicked
   */
  async onRunAuditClicked(): Promise<void> {
    const selectedCase = this.uiState.selectedCase;
    this.uiState.modal.auditProgress = true;

    try {
      await this.handlers.handleRunComplianceAudit({
        caseId: selectedCase.caseId,
        hospitalName: selectedCase.hospitalName,
        patientName: selectedCase.patientName,
        billingItems: selectedCase.billingItems
      });

      this.uiState.auditProgressSteps[4].status = 'COMPLETED';
      this.uiState.auditProgressSteps[4].progressPercent = 100;
    } catch (error: any) {
      console.error('[UI Error]', error);
      this.uiState.alerts.unshift({
        id: `alert-${Date.now()}`,
        type: 'error',
        title: '❌ Audit Failed',
        message: error.message
      });
    }
  }

  /**
   * UI EVENT: Legal Notice Modal "📤 Send Legal Notice" button clicked
   */
  async onSendLegalNoticeClicked(formData: {
    patientName: string;
    hospitalName: string;
    illegalAmount: number;
    recipientEmail: string;
    noticeBody: string;
  }): Promise<void> {
    this.uiState.legalNoticeSending = true;

    try {
      const noticeResult = await this.handlers.handleDispatchLegalNotice({
        patientName: formData.patientName,
        hospitalName: formData.hospitalName,
        illegalCashDemanded: formData.illegalAmount,
        recipientEmail: formData.recipientEmail,
        noticeBody: formData.noticeBody
      });

      if (noticeResult.success) {
        this.uiState.modal.legalNotice = false;
        this.uiState.alerts.unshift({
          id: `alert-${Date.now()}`,
          type: 'success',
          title: '✅ Legal Notice Sent',
          message: noticeResult.message
        });
      } else {
        throw new Error(noticeResult.message);
      }
    } catch (error: any) {
      console.error('[UI Error]', error);
      this.uiState.alerts.unshift({
        id: `alert-${Date.now()}`,
        type: 'error',
        title: '❌ Legal Notice Failed',
        message: error.message
      });
    } finally {
      this.uiState.legalNoticeSending = false;
    }
  }

  /**
   * UI EVENT: "▶ Execute All Workflows" button clicked
   */
  async onExecuteAllWorkflowsClicked(): Promise<void> {
    this.uiState.executeAllWorkflows = true;

    try {
      const batchResult = await this.handlers.handleExecuteAllWorkflows(this.uiState.cases);

      this.uiState.alerts.unshift({
        id: `alert-${Date.now()}`,
        type: 'success',
        title: '✅ Batch Workflows Executed',
        message: `${batchResult.executedCount}/${this.uiState.cases.length} cases processed successfully.`
      });
    } catch (error: any) {
      console.error('[UI Error]', error);
      this.uiState.alerts.unshift({
        id: `alert-${Date.now()}`,
        type: 'error',
        title: '❌ Batch Execution Failed',
        message: error.message
      });
    } finally {
      this.uiState.executeAllWorkflows = false;
    }
  }

  /**
   * UI INITIALIZATION: Start live polling on dashboard mount
   */
  initializeLivePolling(): string {
    return this.handlers.startWorkflowPolling(
      (status) => {
        this.uiState.lastUpdate = status.lastUpdate;
      },
      5000
    );
  }

  /**
   * UI CLEANUP: Stop polling on dashboard unmount
   */
  cleanupLivePolling(pollerId: string): void {
    this.handlers.stopWorkflowPolling(pollerId);
  }
}
