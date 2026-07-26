import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';

const NLEM_MEDICINES_DB: Record<string, { brandName: string; genericName: string; maxPriceINRPerUnit: number; unitType: string; nlemSchedule: string }> = {
  'paracetamol_650': {
    brandName: 'Dolo 650 / Calpol 650',
    genericName: 'Paracetamol 650mg',
    maxPriceINRPerUnit: 2.15,
    unitType: 'tablet',
    nlemSchedule: 'NLEM 2026 Schedule 1 (Analgesic)'
  },
  'insulin_human_regular': {
    brandName: 'Human Actrapid / Insugen',
    genericName: 'Human Insulin Injection 40IU/ml',
    maxPriceINRPerUnit: 145.50,
    unitType: '10ml vial',
    nlemSchedule: 'NLEM 2026 Schedule 1 (Endocrine)'
  },
  'atorvastatin_10': {
    brandName: 'Atorva 10 / Lipvas 10',
    genericName: 'Atorvastatin 10mg',
    maxPriceINRPerUnit: 4.80,
    unitType: 'tablet',
    nlemSchedule: 'NLEM 2026 Schedule 1 (Cardiovascular)'
  },
  'azithromycin_500': {
    brandName: 'Azithral 500 / Azee 500',
    genericName: 'Azithromycin 500mg',
    maxPriceINRPerUnit: 23.40,
    unitType: 'tablet',
    nlemSchedule: 'NLEM 2026 Schedule 1 (Anti-infective)'
  },
  'pantoprazole_40': {
    brandName: 'Pan 40 / Pantocid 40',
    genericName: 'Pantoprazole 40mg',
    maxPriceINRPerUnit: 7.90,
    unitType: 'tablet',
    nlemSchedule: 'NLEM 2026 Schedule 1 (Gastrointestinal)'
  }
};

export class PharmacyAndRebateTools {

  @Tool({
    name: 'audit_pharmacy_drug_prices',
    description: 'Verify NPPA statutory ceiling prices for essential life-saving medicines under National List of Essential Medicines (NLEM 2026) & DPCO regulations.',
    inputSchema: z.object({
      medicine_key: z.enum([
        'paracetamol_650',
        'insulin_human_regular',
        'atorvastatin_10',
        'azithromycin_500',
        'pantoprazole_40'
      ]).default('paracetamol_650').describe('Essential drug key'),
      quantity: z.number().default(10).describe('Quantity of units purchased'),
      charged_total_inr: z.number().optional().describe('Total price charged by hospital pharmacy in INR')
    })
  })
  @Widget('pharmacy-audit')
  async auditPharmacyDrugPrices(input: { medicine_key?: string; quantity?: number; charged_total_inr?: number }, ctx: ExecutionContext) {
    const key = input?.medicine_key || 'paracetamol_650';
    const qty = input?.quantity ?? 10;
    const charged = input?.charged_total_inr;

    ctx.logger.info('Auditing pharmacy drug price ceiling', { key, qty, charged });

    const med = NLEM_MEDICINES_DB[key] || NLEM_MEDICINES_DB['paracetamol_650'];
    const legalMaxTotalINR = Math.round(med.maxPriceINRPerUnit * qty * 100) / 100;

    let isOvercharged = false;
    let excessAmountINR = 0;
    let status = 'COMPLIANT_NLEM';

    if (charged !== undefined && charged !== null) {
      if (charged > legalMaxTotalINR) {
        isOvercharged = true;
        excessAmountINR = Math.round((charged - legalMaxTotalINR) * 100) / 100;
        status = 'ILLEGAL_MEDICINE_OVERCHARGE';
      }
    }

    return {
      medicineKey: key,
      brandName: med.brandName,
      genericName: med.genericName,
      nlemSchedule: med.nlemSchedule,
      quantityPurchased: qty,
      unitType: med.unitType,
      statutoryMaxPricePerUnitINR: med.maxPriceINRPerUnit,
      legalMaxTotalINR,
      hospitalPharmacyChargedTotalINR: charged ?? null,
      isOvercharged,
      excessAmountINR,
      status,
      legalRecourse: isOvercharged
        ? `Hospital pharmacy exceeded NPPA ceiling by ₹${excessAmountINR}. Report to State Drug Controller & NPPA Pharma Sahi Daam App.`
        : 'Pharmacy price is within statutory ceiling.'
    };
  }

  @Tool({
    name: 'calculate_out_of_pocket_cashless_rebate',
    description: 'Calculates legal reimbursement entitlement and penalty interest for citizens forced to pay illegal out-of-pocket cash deposits at empaneled PM-JAY hospitals.',
    inputSchema: z.object({
      illegal_cash_paid_inr: z.number().default(25000).describe('Amount of illegal cash deposit forced by hospital'),
      days_since_payment: z.number().default(15).describe('Number of days since payment was made')
    })
  })
  @Widget('rebate-calculator')
  async calculateOutOfPocketCashlessRebate(input: { illegal_cash_paid_inr?: number; days_since_payment?: number }, ctx: ExecutionContext) {
    const cashPaid = input?.illegal_cash_paid_inr ?? 25000;
    const days = input?.days_since_payment ?? 15;

    ctx.logger.info('Calculating cashless rebate and penalty entitlement', { cashPaid, days });

    // Under NHA Section 16 Guidelines, 12% per annum penalty interest applies for delayed refund of illegal cash
    const annualPenaltyRate = 0.12;
    const penaltyInterestINR = Math.round((cashPaid * annualPenaltyRate * (days / 365)) * 100) / 100;
    const totalReimbursementEntitlementINR = Math.round((cashPaid + penaltyInterestINR) * 100) / 100;

    return {
      illegalCashPaidINR: cashPaid,
      daysElapsed: days,
      penaltyInterestRatePercent: 12,
      penaltyInterestAccruedINR: penaltyInterestINR,
      totalReimbursementEntitlementINR,
      legalDirective: 'Under NHA PM-JAY Clause 16.4, hospitals must issue a 100% full refund plus statutory penalty interest within 7 days of complaint.'
    };
  }
}
