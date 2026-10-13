import { calculateInvoiceTotals, calculateLineItem, numberToWordsINR, round2 } from './erp-engine.js';

function runTests() {
  console.log('--- Testing AlphaTex ERP Engine ---');

  // Test 1: Rounding
  console.assert(round2(100.456) === 100.46, 'Round 100.456 should be 100.46');
  console.assert(round2(100.444) === 100.44, 'Round 100.444 should be 100.44');

  // Test 2: Amount to Words INR
  const words = numberToWordsINR(150450);
  console.assert(
    words === 'Rupees One Lakh Fifty Thousand Four Hundred and Fifty Only',
    `Expected 'Rupees One Lakh Fifty Thousand Four Hundred and Fifty Only', got '${words}'`
  );

  // Test 3: Intrastate line item (5% tax rate -> 2.5% CGST, 2.5% SGST)
  const line1 = calculateLineItem({
    description: 'Cotton Yarn',
    qty: 10,
    rate: 100,
    discountPct: 0,
    taxRatePct: 5,
    isInterstate: false,
  });

  console.assert(line1.grossAmount === 1000, 'Gross amount should be 1000');
  console.assert(line1.taxableValue === 1000, 'Taxable value should be 1000');
  console.assert(line1.cgstAmount === 25, 'CGST should be 25');
  console.assert(line1.sgstAmount === 25, 'SGST should be 25');
  console.assert(line1.igstAmount === 0, 'IGST should be 0');
  console.assert(line1.lineTotal === 1050, 'Line total should be 1050');

  // Test 4: Interstate line item (18% tax rate -> 18% IGST)
  const line2 = calculateLineItem({
    description: 'Dyeing Chemical',
    qty: 50,
    rate: 200,
    discountPct: 10,
    taxRatePct: 18,
    isInterstate: true,
  });

  console.assert(line2.grossAmount === 10000, 'Gross amount 10000');
  console.assert(line2.discountAmount === 1000, 'Discount amount 1000');
  console.assert(line2.taxableValue === 9000, 'Taxable value 9000');
  console.assert(line2.igstAmount === 1620, 'IGST amount 1620');
  console.assert(line2.cgstAmount === 0 && line2.sgstAmount === 0, 'CGST/SGST 0 for interstate');

  // Test 5: Full Invoice Totals calculation
  const invoiceTotals = calculateInvoiceTotals(
    [
      { qty: 100, rate: 50, discountPct: 0, taxRatePct: 12, hsn: '5205' },
      { qty: 50, rate: 100, discountPct: 10, taxRatePct: 18, hsn: '5205' },
    ],
    {
      isInterstate: false,
      freightCharges: 200,
      autoRound: true,
    }
  );

  console.assert(invoiceTotals.subtotalGross === 10000, 'Subtotal gross 10000');
  console.assert(invoiceTotals.totalItemDiscount === 500, 'Item discount 500');
  console.assert(invoiceTotals.netTaxableValue === 9700, 'Net taxable value 9700 (9500 + 200 freight)');
  console.assert(invoiceTotals.grandTotal > 0, 'Grand total should be computed');

  console.log('✅ ALL ERP ENGINE TESTS PASSED SUCCESSFULLY!');
}

runTests();
