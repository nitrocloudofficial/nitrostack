/**
 * Generates self-contained, pixel-perfect Tally GST Tax Invoice HTML for print and viewing
 */

export function generateTallyInvoiceHTML(invoice: any): string {
  const fmt = (val: number = 0) =>
    val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const itemsRows = (invoice.items || [])
    .map(
      (item: any, idx: number) => `
      <tr>
        <td style="border:1px solid #000; padding:6px; text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #000; padding:6px; font-weight:bold;">${item.description}</td>
        <td style="border:1px solid #000; padding:6px; text-align:center; font-family:monospace;">${item.hsn}</td>
        <td style="border:1px solid #000; padding:6px; text-align:right;">${item.qty}</td>
        <td style="border:1px solid #000; padding:6px; text-align:right;">₹ ${fmt(item.rate)}</td>
        <td style="border:1px solid #000; padding:6px; text-align:center;">${item.unit || 'Kgs'}</td>
        <td style="border:1px solid #000; padding:6px; text-align:right; font-weight:bold;">₹ ${fmt(item.lineTotal)}</td>
      </tr>
    `
    )
    .join('');

  const hsnRows = (invoice.hsnSummary || [])
    .map(
      (hsn: any) => `
      <tr>
        <td style="border:1px solid #000; padding:4px; text-align:center; font-family:monospace;">${hsn.hsn}</td>
        <td style="border:1px solid #000; padding:4px; text-align:right;">₹ ${fmt(hsn.taxableValue)}</td>
        ${
          !invoice.isInterstate
            ? `
            <td style="border:1px solid #000; padding:4px; text-align:center;">${hsn.taxRatePct / 2}%</td>
            <td style="border:1px solid #000; padding:4px; text-align:right;">₹ ${fmt(hsn.cgstAmount)}</td>
            <td style="border:1px solid #000; padding:4px; text-align:center;">${hsn.taxRatePct / 2}%</td>
            <td style="border:1px solid #000; padding:4px; text-align:right;">₹ ${fmt(hsn.sgstAmount)}</td>
          `
            : `
            <td style="border:1px solid #000; padding:4px; text-align:center;">${hsn.taxRatePct}%</td>
            <td style="border:1px solid #000; padding:4px; text-align:right;">₹ ${fmt(hsn.igstAmount)}</td>
          `
        }
        <td style="border:1px solid #000; padding:4px; text-align:right; font-weight:bold;">₹ ${fmt(hsn.totalTax)}</td>
      </tr>
    `
    )
    .join('');

  const totalQty = (invoice.items || []).reduce((acc: number, i: any) => acc + (i.qty || 0), 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${invoice.invoiceNo}</title>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      .no-print { display: none !important; }
      body { background: #fff !important; }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f8fafc;
      color: #000000;
    }
    .print-btn {
      background: #16a34a;
      color: white;
      border: none;
      padding: 10px 20px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 16px;
      box-shadow: 0 4px 10px rgba(22, 163, 74, 0.3);
    }
    .invoice-box {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      border: 2px solid #000000;
      box-sizing: border-box;
      font-size: 11px;
      line-height: 1.3;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000000; padding: 6px; box-sizing: border-box; }
  </style>
</head>
<body>

  <div style="max-width: 850px; margin: 0 auto; text-align: right;" class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Click Here to Print / Download PDF</button>
  </div>

  <div class="invoice-box">
    <!-- Title -->
    <div style="text-align: center; border-bottom: 1.5px solid #000; padding: 6px 0; position: relative;">
      <strong style="font-size: 15px; letter-spacing: 1px;">TAX INVOICE</strong>
      <span style="position: absolute; right: 10px; top: 8px; font-size: 9px; font-style: italic;">(ORIGINAL FOR RECIPIENT)</span>
    </div>

    <!-- Header Grid -->
    <table>
      <tbody>
        <tr>
          <td rowspan="3" style="width: 50%; vertical-align: top;">
            <div style="font-size: 9px; text-transform: uppercase;">Seller</div>
            <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">${invoice.seller.name}</div>
            <div>${invoice.seller.address}</div>
            <div>Phone: <strong>${invoice.seller.phone}</strong></div>
            <div>Email: <strong>${invoice.seller.email}</strong></div>
            <div>GSTIN/UIN: <strong>${invoice.seller.gstin}</strong></div>
            <div>PAN: <strong>${invoice.seller.pan || 'AAAAA0000A'}</strong></div>
          </td>
          <td style="width: 25%; vertical-align: top;">
            <div style="font-size: 9px;">Invoice No.</div>
            <div style="font-weight: bold; font-size: 12px;">${invoice.invoiceNo}</div>
          </td>
          <td style="width: 25%; vertical-align: top;">
            <div style="font-size: 9px;">Dated</div>
            <div style="font-weight: bold; font-size: 12px;">${invoice.invoiceDate}</div>
          </td>
        </tr>
        <tr>
          <td style="vertical-align: top;">
            <div style="font-size: 9px;">Delivery Note</div>
            <div><strong>Standard Dispatch</strong></div>
          </td>
          <td style="vertical-align: top;">
            <div style="font-size: 9px;">Mode/Terms of Payment</div>
            <div><strong>${invoice.paymentTerms || 'Credit - 15 Days'}</strong></div>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="vertical-align: top;">
            <div style="font-size: 9px;">Other Reference(s)</div>
            <div><strong>GST Supply Type: ${invoice.isInterstate ? 'Interstate (IGST)' : 'Intrastate (CGST + SGST)'}</strong></div>
          </td>
        </tr>
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <div style="font-size: 9px; text-transform: uppercase;">Buyer (Billed To)</div>
            <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">${invoice.party.name}</div>
            <div>${invoice.party.address}</div>
            <div>Phone: <strong>${invoice.party.phone || 'N/A'}</strong></div>
            <div>GSTIN/UIN: <strong>${invoice.party.gstin}</strong></div>
            <div>State: <strong>${invoice.party.state} (${invoice.party.stateCode})</strong></div>
          </td>
          <td colspan="2" style="vertical-align: top;">
            <div style="font-size: 9px;">Terms of Delivery</div>
            <div>${invoice.notes || '1. Goods once sold will not be taken back. 2. Tirupur jurisdiction.'}</div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Goods Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 6%; text-align: center;">Sl No.</th>
          <th style="width: 38%; text-align: left;">Description of Goods</th>
          <th style="width: 12%; text-align: center;">HSN/SAC</th>
          <th style="width: 12%; text-align: right;">Quantity</th>
          <th style="width: 12%; text-align: right;">Rate</th>
          <th style="width: 8%; text-align: center;">Unit</th>
          <th style="width: 12%; text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}

        ${
          invoice.freightCharges > 0
            ? `
          <tr>
            <td style="text-align: center;">-</td>
            <td style="font-style: italic;">Freight & Handling Charges</td>
            <td style="text-align: center;">9965</td>
            <td style="text-align: right;">-</td>
            <td style="text-align: right;">-</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: right;">₹ ${fmt(invoice.freightCharges)}</td>
          </tr>
        `
            : ''
        }

        ${
          invoice.roundOff !== 0
            ? `
          <tr>
            <td style="text-align: center;">-</td>
            <td style="font-style: italic;">Round Off</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: right;">-</td>
            <td style="text-align: right;">-</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: right;">${invoice.roundOff > 0 ? `+${invoice.roundOff}` : invoice.roundOff}</td>
          </tr>
        `
            : ''
        }

        <tr style="font-weight: bold;">
          <td colSpan="3" style="text-align: right; padding: 8px;">Total</td>
          <td style="text-align: right; padding: 8px;">${totalQty}</td>
          <td style="padding: 8px;"></td>
          <td style="padding: 8px;"></td>
          <td style="text-align: right; padding: 8px; font-size: 12px;">₹ ${fmt(invoice.grandTotal)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Words Section -->
    <div style="padding: 8px; border-bottom: 1.5px solid #000;">
      <div style="float: left; width: 80%;">
        Amount Chargeable (in words):<br>
        <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: '#1e3a8a' }}>${invoice.amountInWords}</strong>
      </div>
      <div style="float: right; text-align: right; font-style: italic;">E. & O.E.</div>
      <div style="clear: both;"></div>
    </div>

    <!-- HSN Tax Summary Table -->
    <table>
      <thead>
        <tr>
          <th rowSpan="2" style="font-size: 10px; text-align: center;">HSN/SAC</th>
          <th rowSpan="2" style="font-size: 10px; text-align: right;">Taxable Value (₹)</th>
          ${
            !invoice.isInterstate
              ? `
              <th colSpan="2" style="font-size: 10px; text-align: center;">Central Tax (CGST)</th>
              <th colSpan="2" style="font-size: 10px; text-align: center;">State Tax (SGST)</th>
            `
              : `
              <th colSpan="2" style="font-size: 10px; text-align: center;">Integrated Tax (IGST)</th>
            `
          }
          <th rowSpan="2" style="font-size: 10px; text-align: right;">Total Tax Amount (₹)</th>
        </tr>
        <tr>
          ${
            !invoice.isInterstate
              ? `
              <th style="font-size: 9px; text-align: center;">Rate</th>
              <th style="font-size: 9px; text-align: right;">Amount</th>
              <th style="font-size: 9px; text-align: center;">Rate</th>
              <th style="font-size: 9px; text-align: right;">Amount</th>
            `
              : `
              <th style="font-size: 9px; text-align: center;">Rate</th>
              <th style="font-size: 9px; text-align: right;">Amount</th>
            `
          }
        </tr>
      </thead>
      <tbody>
        ${hsnRows}
      </tbody>
    </table>

    <!-- Footer Section -->
    <table>
      <tbody>
        <tr>
          <td style="width: 50%; vertical-align: top; padding: 8px;">
            <div>Company PAN: <strong>${invoice.seller.pan || 'AAAAA0000A'}</strong></div>
            <div style="margin-top: 6px;">
              <strong>Company's Bank Details:</strong><br>
              Bank Name: <strong>${invoice.bankDetails?.bankName || 'State Bank of India'}</strong><br>
              A/c No.: <strong>${invoice.bankDetails?.accountNo || '39847192834'}</strong><br>
              Branch & IFS Code: <strong>${invoice.bankDetails?.ifsc || 'SBIN0001234'} (${invoice.bankDetails?.branch || 'Tirupur Main'})</strong>
            </div>
          </td>
          <td style="width: 50%; text-align: right; vertical-align: top; padding: 8px; height: 90px;">
            <div style="margin-bottom: 45px;">for <strong>${invoice.seller.name}</strong></div>
            <div style="font-weight: bold;">Authorised Signatory</div>
          </td>
        </tr>
        <tr>
          <td colSpan="2" style="border-top: 1px solid #000; padding: 6px 8px; font-size: 9px;">
            <strong>Declaration:</strong><br>
            1. We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.<br>
            2. All disputes are subject to Tirupur jurisdiction.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</body>
</html>`;
}
