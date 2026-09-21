/**
 * AlphaTex ERP - Core Calculation & Currency Engine (erp-engine.ts)
 * Guarantees exact paisa-level rounding, GST splits, discounts, additional charges,
 * currency formatting, and Indian Rupees amount-in-words conversion.
 */

export interface LineItemInput {
  description?: string;
  hsn?: string;
  qty: number;
  rate: number;
  discountPct?: number;
  taxRatePct?: number;
  isInterstate?: boolean;
}

export interface CalculatedLineItem {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  grossAmount: number;
  discountPct: number;
  discountAmount: number;
  taxableValue: number;
  taxRatePct: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  lineTotal: number;
}

export interface HsnSummaryItem {
  hsn: string;
  taxableValue: number;
  taxRatePct: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export interface InvoiceExtrasInput {
  invoiceDiscountPct?: number;
  freightCharges?: number;
  packingCharges?: number;
  isInterstate?: boolean;
  autoRound?: boolean;
}

export interface InvoiceTotals {
  items: CalculatedLineItem[];
  hsnSummary: HsnSummaryItem[];
  subtotalGross: number;
  totalItemDiscount: number;
  totalTaxableValue: number;
  invoiceDiscountPct: number;
  invoiceDiscountAmount: number;
  freightCharges: number;
  packingCharges: number;
  netTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTaxAmount: number;
  unroundedGrandTotal: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
}

/**
 * Helper to round float to 2 decimal places reliably
 */
export function round2(num: number): number {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Format number as currency (e.g. ₹ 1,50,450.00)
 */
export function formatCurrency(amount: number, currencySymbol = '₹'): string {
  const val = round2(amount || 0);
  const formatted = val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currencySymbol} ${formatted}`;
}

/**
 * Convert number to Indian Rupees Amount in Words (e.g. 150450 -> "Rupees One Lakh Fifty Thousand Four Hundred Fifty Only")
 */
export function numberToWordsINR(amount: number): string {
  const val = round2(amount);
  if (isNaN(val) || val < 0) return 'Rupees Zero Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(num: number): string {
    const numStr = num.toString();
    if (numStr.length > 9) return 'overflow';
    const n = ('000000000' + numStr).substr(-9);
    const match = n.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!match) return '';
    let str = '';
    str += (Number(match[1]) !== 0) ? (a[Number(match[1])] || b[Number(match[1][0])] + ' ' + a[Number(match[1][1])]) + 'Crore ' : '';
    str += (Number(match[2]) !== 0) ? (a[Number(match[2])] || b[Number(match[2][0])] + ' ' + a[Number(match[2][1])]) + 'Lakh ' : '';
    str += (Number(match[3]) !== 0) ? (a[Number(match[3])] || b[Number(match[3][0])] + ' ' + a[Number(match[3][1])]) + 'Thousand ' : '';
    str += (Number(match[4]) !== 0) ? (a[Number(match[4])] || b[Number(match[4][0])] + ' ' + a[Number(match[4][1])]) + 'Hundred ' : '';
    str += (Number(match[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(match[5])] || b[Number(match[5][0])] + ' ' + a[Number(match[5][1])]) : '';
    return str;
  }

  const integerPart = Math.floor(val);
  const paisePart = Math.round((val - integerPart) * 100);

  let words = 'Rupees ' + (integerPart === 0 ? 'Zero ' : inWords(integerPart));
  if (paisePart > 0) {
    words += 'and ' + inWords(paisePart) + 'Paise ';
  }
  words += 'Only';
  return words.replace(/\s+/g, ' ').trim();
}

/**
 * Calculate single line-item taxable value and tax details
 */
export function calculateLineItem(item: LineItemInput): CalculatedLineItem {
  const qty = round2(item.qty || 0);
  const rate = round2(item.rate || 0);
  const discountPct = round2(item.discountPct || 0);
  const taxRatePct = round2(item.taxRatePct || 0);
  const isInterstate = Boolean(item.isInterstate);
  const description = item.description || 'Item';
  const hsn = item.hsn || 'GENERAL';

  const grossAmount = round2(qty * rate);
  const discountAmount = round2((grossAmount * discountPct) / 100);
  const taxableValue = round2(grossAmount - discountAmount);

  let cgstRate = 0, sgstRate = 0, igstRate = 0;
  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

  if (isInterstate) {
    igstRate = taxRatePct;
    igstAmount = round2((taxableValue * igstRate) / 100);
  } else {
    cgstRate = round2(taxRatePct / 2);
    sgstRate = cgstRate;
    cgstAmount = round2((taxableValue * cgstRate) / 100);
    sgstAmount = cgstAmount; // Exact half split
  }

  const totalTax = round2(cgstAmount + sgstAmount + igstAmount);
  const lineTotal = round2(taxableValue + totalTax);

  return {
    description,
    hsn,
    qty,
    rate,
    grossAmount,
    discountPct,
    discountAmount,
    taxableValue,
    taxRatePct,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalTax,
    lineTotal
  };
}

/**
 * Calculate total invoice summary, HSN breakdown, additional charges, and round-off
 */
export function calculateInvoiceTotals(items: LineItemInput[] = [], extras: InvoiceExtrasInput = {}): InvoiceTotals {
  let subtotalGross = 0;
  let totalItemDiscount = 0;
  let totalTaxableValue = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  const hsnSummaryMap: Record<string, HsnSummaryItem> = {};

  const calculatedItems = items.map(rawItem => {
    const calculated = calculateLineItem({
      ...rawItem,
      isInterstate: extras.isInterstate
    });

    subtotalGross = round2(subtotalGross + calculated.grossAmount);
    totalItemDiscount = round2(totalItemDiscount + calculated.discountAmount);
    totalTaxableValue = round2(totalTaxableValue + calculated.taxableValue);
    totalCGST = round2(totalCGST + calculated.cgstAmount);
    totalSGST = round2(totalSGST + calculated.sgstAmount);
    totalIGST = round2(totalIGST + calculated.igstAmount);

    // Group by HSN
    const hsn = rawItem.hsn || 'GENERAL';
    if (!hsnSummaryMap[hsn]) {
      hsnSummaryMap[hsn] = {
        hsn,
        taxableValue: 0,
        taxRatePct: calculated.taxRatePct,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0
      };
    }
    hsnSummaryMap[hsn].taxableValue = round2(hsnSummaryMap[hsn].taxableValue + calculated.taxableValue);
    hsnSummaryMap[hsn].cgstAmount = round2(hsnSummaryMap[hsn].cgstAmount + calculated.cgstAmount);
    hsnSummaryMap[hsn].sgstAmount = round2(hsnSummaryMap[hsn].sgstAmount + calculated.sgstAmount);
    hsnSummaryMap[hsn].igstAmount = round2(hsnSummaryMap[hsn].igstAmount + calculated.igstAmount);
    hsnSummaryMap[hsn].totalTax = round2(hsnSummaryMap[hsn].totalTax + calculated.totalTax);

    return calculated;
  });

  // Invoice Level Discounts & Additional Charges
  const invoiceDiscountPct = round2(extras.invoiceDiscountPct || 0);
  const invoiceDiscountAmount = round2((totalTaxableValue * invoiceDiscountPct) / 100);
  const freightCharges = round2(extras.freightCharges || 0);
  const packingCharges = round2(extras.packingCharges || 0);

  const netTaxableValue = round2(totalTaxableValue - invoiceDiscountAmount + freightCharges + packingCharges);
  const totalTaxAmount = round2(totalCGST + totalSGST + totalIGST);

  const unroundedGrandTotal = round2(netTaxableValue + totalTaxAmount);
  let grandTotal = unroundedGrandTotal;
  let roundOff = 0;

  if (extras.autoRound !== false) {
    grandTotal = Math.round(unroundedGrandTotal);
    roundOff = round2(grandTotal - unroundedGrandTotal);
  }

  const amountInWords = numberToWordsINR(grandTotal);

  return {
    items: calculatedItems,
    hsnSummary: Object.values(hsnSummaryMap),
    subtotalGross,
    totalItemDiscount,
    totalTaxableValue,
    invoiceDiscountPct,
    invoiceDiscountAmount,
    freightCharges,
    packingCharges,
    netTaxableValue,
    totalCGST,
    totalSGST,
    totalIGST,
    totalTaxAmount,
    unroundedGrandTotal,
    roundOff,
    grandTotal,
    amountInWords
  };
}
