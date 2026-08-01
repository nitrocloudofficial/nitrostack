import { Injectable, ExecutionContext } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';
import { parseCsvRobust } from '../ingestion/ingestion.tools.js';

export interface WorkflowStepResult {
  step_name: string;
  success: boolean;
  data: any;
  confidence: number; // 0.0 to 1.0
  warnings: string[];
  missingInformation: string[];
  retried: boolean;
}

/**
 * WorkflowService — Sequential Workflow Execution, Piping, Confidence Scoring, and Failure Recovery Engine
 *
 * NOTE: Internal NestJS service provider — strictly 0 new MCP tools registered.
 */
@Injectable({ deps: [FinanceStore] })
export class WorkflowService {
  constructor(private store: FinanceStore) {}

  /**
   * Evaluates Confidence Score & Diagnostic Warnings for a Tool Step Result
   */
  evaluateConfidence(stepName: string, data: any): { confidence: number; warnings: string[]; missingInformation: string[] } {
    const warnings: string[] = [];
    const missing: string[] = [];
    let confidence = 0.95;

    if (!data) {
      return { confidence: 0, warnings: ['Step returned null/undefined payload.'], missingInformation: ['All Step Data'] };
    }

    if (stepName === 'ingest_transaction_data') {
      if (data.transactions_added === 0) {
        confidence = 0.2;
        warnings.push('0 valid transactions were extracted.');
        missing.push('Valid CSV column headers (Date, Description, Amount)');
      } else if (data.skipped_rows > 0) {
        confidence = 0.85;
        warnings.push(`${data.skipped_rows} row(s) were skipped due to formatting issues.`);
      }
    } else if (stepName === 'categorize_expenses') {
      if (data.still_uncategorized > 0) {
        confidence = Math.max(0.4, 1.0 - data.still_uncategorized / (data.total_transactions || 1));
        warnings.push(`${data.still_uncategorized} transaction(s) labeled "Uncategorized".`);
        missing.push('Specific merchant keyword matching rules for uncategorized items');
      }
    } else if (stepName === 'analyze_spending') {
      const income = this.store.getMonthlyIncome();
      if (!income) {
        confidence -= 0.3;
        warnings.push('Monthly income is not set.');
        missing.push('Monthly Income');
      }
    } else if (stepName === 'manage_emergency_fund') {
      if (data.status === 'critical_gap') {
        warnings.push('Emergency Safety Reserve has a critical gap.');
      }
    }

    return { confidence: Number(confidence.toFixed(2)), warnings, missingInformation: missing };
  }

  /**
   * Failure Recovery Retry Strategy for CSV Parsing:
   * Standard Parser -> Fuzzy Column Scanner -> Fallback Numeric Extraction
   */
  async executeCsvIngestionWithRetry(
    csvText: string,
    fileName: string,
    ingestionFn: (text: string) => Promise<any>,
    ctx: ExecutionContext
  ): Promise<WorkflowStepResult> {
    ctx.logger.info('WorkflowEngine: Executing CSV Ingestion with Retry Strategy', { fileName });

    // Attempt 1: Standard Ingestion
    let res = await ingestionFn(csvText);
    let evalRes = this.evaluateConfidence('ingest_transaction_data', res);

    if (res.success && res.transactions_added > 0 && evalRes.confidence >= 0.7) {
      return {
        step_name: 'ingest_transaction_data',
        success: true,
        data: res,
        confidence: evalRes.confidence,
        warnings: evalRes.warnings,
        missingInformation: evalRes.missingInformation,
        retried: false,
      };
    }

    // Attempt 2: Retry with Fuzzy Header Normalization
    ctx.logger.warn('WorkflowEngine: Attempt 1 low confidence or 0 transactions. Initiating Retry 2 (Fuzzy Normalization)');
    const fuzzyCsvText = csvText.replace(/;/g, ',').replace(/\t/g, ',');
    const parseRes = parseCsvRobust(fuzzyCsvText);

    if (parseRes.success && parseRes.transactions.length > 0) {
      for (const t of parseRes.transactions) {
        this.store.addTransaction(t);
      }
      const retryData = {
        success: true,
        file_name: fileName,
        transactions_added: parseRes.transactions.length,
        skipped_rows: parseRes.skipped_rows_count,
        headers_detected: parseRes.headers_found,
        matched_columns: parseRes.matched_columns,
        message: `Retry successful: Ingested ${parseRes.transactions.length} transactions after fuzzy normalization.`,
      };
      const retryEval = this.evaluateConfidence('ingest_transaction_data', retryData);
      return {
        step_name: 'ingest_transaction_data',
        success: true,
        data: retryData,
        confidence: Math.min(0.85, retryEval.confidence),
        warnings: [...evalRes.warnings, 'Required fuzzy normalization retry on CSV text.'],
        missingInformation: retryEval.missingInformation,
        retried: true,
      };
    }

    return {
      step_name: 'ingest_transaction_data',
      success: false,
      data: res,
      confidence: 0.1,
      warnings: ['Failed to extract valid transactions after primary and fuzzy parsing retries.'],
      missingInformation: ['Valid CSV file with date, description, and amount columns.'],
      retried: true,
    };
  }

  /**
   * Executes a Workflow Step with Output Piping and Confidence Scoring
   */
  async executeStep<T>(
    stepName: string,
    fn: () => Promise<T>,
    ctx: ExecutionContext
  ): Promise<WorkflowStepResult> {
    try {
      ctx.logger.info(`WorkflowEngine: Executing Step [${stepName}]`);
      const data = await fn();
      const score = this.evaluateConfidence(stepName, data);

      return {
        step_name: stepName,
        success: true,
        data,
        confidence: score.confidence,
        warnings: score.warnings,
        missingInformation: score.missingInformation,
        retried: false,
      };
    } catch (err: any) {
      ctx.logger.error(`WorkflowEngine: Exception in Step [${stepName}]`, { error: err.message });
      return {
        step_name: stepName,
        success: false,
        data: null,
        confidence: 0,
        warnings: [`Step exception: ${err.message}`],
        missingInformation: [],
        retried: false,
      };
    }
  }
}
