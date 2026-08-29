import { Injectable } from '@nitrostack/core';
import { invoices, buildRiskContext } from '../../services/ledger.fixtures.js';
import { assessRisk } from '../../services/risk.service.js';
import type { RiskAssessment } from '../../types/contracts.js';

@Injectable()
export class RiskAssessmentService {
  assess(invoiceId: string): RiskAssessment {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) {
      throw new Error(`Invoice "${invoiceId}" not found`);
    }

    const ctx = buildRiskContext(invoice, new Date().toISOString());
    if (!ctx) {
      throw new Error(`Could not build risk context for invoice "${invoiceId}" — vendor not found`);
    }

    return assessRisk(ctx);
  }
}
